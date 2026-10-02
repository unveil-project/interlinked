## Change

`StringIntMap.get` currently uses the insertion-oriented `probe` helper, which encodes an empty slot as a negative index and then decodes that result for a read. Give reads a dedicated loop that returns the value or supplied default immediately and wraps collision probes with `(i + 1) & mask`.

The table is already power-of-two sized. Capacity, storage, insertion, duplicate rejection, and method signatures remain unchanged. This is an internal, backward-compatible performance change with no public API additions or deprecations.

Add regression coverage for empty maps, equal-hash keys, a collision chain wrapping from the final slot to slot zero, equal-but-distinct strings, negative/extreme stored values, misses, and duplicate rejection. Add `StringIntMapUsageBenchmark` for property lookup/read, fresh-name reads, BeanWrapper access, builder argument lookup, named construction, and copying records or mutable beans.

## Caller-level measurements

The two direct uses in core are the property index and builder argument index in `AbstractInitializableBeanIntrospection`. They feed property access, BeanWrapper, and mapping/builder operations. These are representative source-backed workloads, not a production traffic-frequency survey or an HTTP/serialization throughput claim.

Environment: macOS arm64, OpenJDK 25.0.2, JMH 1.37, G1, `-Xms256m -Xmx256m`. Baseline source: `df4ae2fe669b6ca4be157a4308aca46edd811cf7` on 5.3.x.

Record confirmation used three separate JVM runs per variant, alternating baseline/candidate order between rounds, five 500 ms warmups and five 500 ms measurements per run. Values below are the median of the three fork means. Whole-bean operations are **ns per bean**, not ns per field.

| Record operation | Properties | Baseline | Candidate | Change in time |
|---|---:|---:|---:|---:|
| Read property by name | 2 | 4.86 ns | 4.66 ns | -4.2% |
| Read property by name | 8 | 6.32 ns | 6.19 ns | -2.1% |
| BeanWrapper read | 2 | 5.67 ns | 5.42 ns | -4.5% |
| BeanWrapper read | 8 | 11.97 ns | 12.01 ns | +0.4% |
| Build with named fields | 2 | 27.31 ns | 26.64 ns | -2.5% |
| Build with named fields | 8 | 47.62 ns | 47.54 ns | -0.2% |
| Copy existing bean and build | 2 | 31.91 ns | 29.97 ns | -6.1% |
| Copy existing bean and build | 8 | 96.04 ns | 85.17 ns | **-11.3%** |

The strongest record result is the eight-property copy: baseline fork means ranged **94.66–98.72 ns**, candidate **84.57–85.92 ns**. Eight-property named construction and BeanWrapper access are effectively unchanged. Several small-bean results have overlapping or nearly touching fork ranges and are weaker evidence.

Mutable JavaBeans use ordinary getters/setters and a zero-argument constructor. Three forks, four 500 ms warmups, five 500 ms measurements; JMH mean ± reported error:

| Mutable operation | Properties | Baseline ns/bean | Candidate ns/bean |
|---|---:|---:|---:|
| Build with named fields | 2 | 55.415 ± 0.176 | 55.218 ± 1.060 |
| Build with named fields | 8 | 80.707 ± 8.572 | 85.138 ± 6.870 |
| Copy existing bean and build | 2 | 56.409 ± 1.261 | 57.987 ± 1.927 |
| Copy existing bean and build | 8 | 107.963 ± 2.332 | 107.989 ± 2.096 |

**No clear mutable-bean construction/copy improvement.** The error ranges overlap, including the nominal regressions.

The existing `PropertyIndexBenchmark` was also measured using its two-/three-property BeanA/BeanB/BeanC fixtures, a fixed random seed, and normalization of the 50-item bundle to ns per lookup. Three forks, three 400 ms warmups, five 400 ms measurements:

| Bean types | Baseline ns/lookup | Candidate ns/lookup |
|---|---:|---:|
| 1 | 1.326 ± 0.078 | 1.320 ± 0.056 |
| 3 | 1.873 ± 0.049 | **1.525 ± 0.053** |

The three-type fixture improves by **18.6% (~0.35 ns/lookup)**; the one-type fixture is unchanged. It repeatedly looks up the cached literal `foo`, so this result should not be extrapolated to fresh parser-created names.

## Measurement limits and alternatives

- Measurements used an isolated harness that recompiled StringIntMap, AbstractInitializableBeanIntrospection and its inner classes, BeanIntrospection, and BeanWrapper from the pinned source. Supporting libraries and annotation processors were cached 5.3.0-SNAPSHOT artifacts, not a fresh complete build of every module at that commit. The caller workloads are now ported into the included benchmark for standard repository runs.
- Reads use a deterministic 1,024-entry query sequence. Dynamic names are equal-but-distinct strings with cached hashes. `propertyReadFreshName` includes allocation and cold hashing. Construction supplies fields in declaration order. Setup validates indexes and built/copied values.
- Early short screening had large construction outliers; those apparent large gains were rejected and are not in the confirmation table.
- A dedicated loop without masking also helped the isolated 16-entry mixed case. The evidence does not establish masking as an independent win; masking the original shared probe alone was inconsistent.
- Smaller tables nearly halved allocation at 64 entries (2,104 → 1,080 B per constructed map), but more than doubled miss time in screening (~1.99 → 4.43 ns). A four-entry linear scan was also slower. Neither is included.
- Isolated mixed-map lookup improved roughly 10–12% at 16 entries, but ordinary 64-entry repeat results were noisy. Both baseline and candidate lookup allocated effectively zero bytes per operation.
- Async-profiler 4.5 CPU profiling showed equality and probing dominating sampled lookup work (~42% of baseline benchmark-stack samples contained String equality). Sampling/inlining attribution cannot explain sub-nanosecond branch costs; profiled timing was not used for speedup claims.

## Reproduction

Run the included workloads on both implementations with the same JVM and benchmark source:

```sh
./gradlew :benchmarks:jmh \
  -Pjmh.includes=io.micronaut.core.beans.StringIntMapUsageBenchmark \
  -Pjmh.fork=3 -Pjmh.warmupIterations=5 -Pjmh.iterations=5 \
  -Pjmh.warmupTime=500ms -Pjmh.timeOnIteration=500ms
```

Default parameters cover two/eight properties for records and mutable beans. `buildByName` and `copyAndBuild` return a complete bean per invocation. The existing `PropertyIndexBenchmark` reports a 50-lookup bundle unless normalized separately.

## Validation

- Focused `StringIntMapSpec`: all four test cases passed.
- `:micronaut-core:check`: **7,589 tests, two skipped**, passed, including style and binary compatibility checks.
- `:benchmarks:jmhClasses`: passed.
- Standalone prototype validation: 8,586,240 reference-map comparisons passed, plus duplicate/miss checks.
- Benchmark setup smoke test: all 36 method/model/size combinations passed (smoke timings were not used as performance evidence).
- Repository-wide `check docs`: failed after 5m 11s in `:micronaut-http-server-netty:test`. `MaxRequestSizeSpec` reported `IllegalStateException: Possible memory leak detected for resource scope 'MaxRequestSizeSpec'` from Netty `LeakPresenceDetector`.
- Isolated rerun, `:micronaut-http-server-netty:test --tests io.micronaut.http.server.netty.MaxRequestSizeSpec`: passed (nine tests, two skipped). This suggests a suite/load interaction but does not prove the failure is unrelated to this change.
- `docs`: passed in the follow-up invocation. The repository's `htmlSanityCheck` task was skipped.
- Full repository `check` was not rerun after the successful isolated test; the full run was not green.
