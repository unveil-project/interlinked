A tracking frame allocates less, and `tracked(value)` allocates less. In a benchmark of `createCache` graphs, one update takes about half the time: the weighted mean is 0.6x of `main`.

| case | `main` | this PR |
| --- | ---: | ---: |
| propagate: 100 chains x 100 deep | 586 µs | 274 µs (0.5x) |
| kairo: diamond | 367 ns | 206 ns (0.6x) |
| kairo: mux | 17.84 µs | 8.43 µs (0.5x) |
| rows: 1000 rows, write 1 | 6.46 µs | 5.89 µs (0.9x) |
| rows: 1000 rows, write all | 99.4 µs | 49.8 µs (0.5x) |
| batch: 10 writes, 1 output | 522 ns | 223 ns (0.4x) |
| create: 1000 signals | 15.75 µs | 9.74 µs (0.6x) |
| create: 1000 computeds, read each | 33.5 µs | 21.7 µs (0.6x) |

<details>
<summary>All 20 cases, with alien-signals for scale</summary>

| case | ember: main | ember: this PR | alien-signals |
| --- | ---: | ---: | ---: |
| propagate: 1 chains x 1 deep | 96 ns | 52 ns (0.5x) | 51 ns (0.5x) |
| propagate: 10 chains x 10 deep | 5.28 µs | 2.39 µs (0.5x) | 2.88 µs (0.5x) |
| propagate: 100 chains x 100 deep | 585.61 µs | 274.10 µs (0.5x) | 490.80 µs (0.8x) |
| propagate: 1 chains x 1000 deep | 50.19 µs | 26.17 µs (0.5x) | 24.80 µs (0.5x) |
| propagate: 1000 chains x 1 deep | 84.97 µs | 44.53 µs (0.5x) | 48.30 µs (0.6x) |
| kairo: avoidable propagation | 326 ns | 130 ns (0.4x) | 69 ns (0.2x) |
| kairo: broad propagation | 6.46 µs | 3.18 µs (0.5x) | 3.64 µs (0.6x) |
| kairo: deep propagation | 2.65 µs | 1.23 µs (0.5x) | 1.12 µs (0.4x) |
| kairo: diamond | 367 ns | 206 ns (0.6x) | 168 ns (0.5x) |
| kairo: mux | 17.84 µs | 8.43 µs (0.5x) | 5.77 µs (0.3x) |
| kairo: repeated observers | 277 ns | 182 ns (0.7x) | 104 ns (0.4x) |
| kairo: triangle | 604 ns | 367 ns (0.6x) | 292 ns (0.5x) |
| kairo: unstable | 470 ns | 282 ns (0.6x) | 283 ns (0.6x) |
| rows: 1000 rows, write 1 | 6.46 µs | 5.89 µs (0.9x) | 5.76 µs (0.9x) |
| rows: 1000 rows, write all | 99.41 µs | 49.81 µs (0.5x) | 60.68 µs (0.6x) |
| batch: 10 writes, 1 output | 522 ns | 223 ns (0.4x) | 222 ns (0.4x) |
| avoidable: write the same value | 4 ns | 4 ns (1.0x) | 9 ns (2.6x) |
| create: 1000 signals | 15.75 µs | 9.74 µs (0.6x) | 2.37 µs (0.2x) |
| create: 1000 computeds, read each | 33.45 µs | 21.74 µs (0.6x) | 25.08 µs (0.7x) |
| create: 1000 outputs | 40.51 µs | 27.98 µs (0.7x) | 34.98 µs (0.9x) |
| weighted geometric mean | 1.0x | 0.6x | 0.6x |

</details>

## The two commits

### 1. Pool trackers and reuse the combined tag of a tracking frame

Before, each tracking frame made one `Tracker`, one `Set`, and one array from that `Set`. In CPU profiles of three graphs, the tracker, its `Set` and `beginTrackFrame` took 27% to 45% of the samples.

- `beginTrackFrame` takes the tracker for its depth from a pool. Frames are strictly nested, so one tracker for each depth is enough.
- A tracker keeps its tags in an array. Each frame has a number, and the tracker writes that number on each tag that it takes. A tag that the frame consumes again costs one comparison.
- `endTrackFrame(previous)` takes the tag that the same frame produced the last time. If the frame consumed the same tags again, the result is that tag, with its memoized revision. `getValue` passes the tag of its cache.
- The loop over the subtags of a combined tag uses an index in place of an iterator.

### 2. Make the functions of a `TrackedValue` on their first use

Before, each `TrackedValue` made four arrow functions and one options object. `get`, `set`, `update` and `freeze` are now accessors that make the bound function on its first read, and keep it.

## What changes for callers

- `endTrackFrame()` with no argument works as before. `@glimmer/runtime` and the curly component manager do not pass a tag in this PR. They get the pool and the array, but not the reuse of the tag.
- Each tag has one more field, `lastFrame`.
- A tag that a nested frame consumes between two consumptions of the outer frame is in the outer frame two times. The combined tag has the same revision.
- `get`, `set`, `update` and `freeze` of a `TrackedValue` are still bound, and each read gives the same function. They are now accessors on the prototype, so `Object.keys()` does not list them, and they are read-only.

## How this was measured

The benchmark is https://github.com/NullVoxPopuli-ai-agent/ember-reactivity-bench. One measurement is the writes of one frame, then one flush that brings every output up to date. Each case runs in its own process. The numbers are the median of 4 rounds on Node 26.10.

Its `research/validator-speed` folder has the profile and the experiment that this PR comes from.

## Rendering: `pnpm bench` against `main`

Rendering is 3.3% faster in script time for the full run, with 50 samples for each side.

- Select is 10 to 11% faster, and update of each 10th row is 8 to 10% faster.
- 4 of the 6 render phases are 4 to 6% faster. Append is 3 to 9% faster.
- `clearItems2` is 7.1% slower. The other four clear phases have no change.

The table, the tracerbench PDF and the method are in [this comment](https://github.com/emberjs/ember.js/pull/21650#issuecomment-5956555161).

## Tests

- New tests for the reuse of the tag, for a tag that a nested frame consumes, for `resetTracking()` with an open frame, and for the functions of a `TrackedValue`.
- The full suite passes locally: 9503 pass, 18 skipped, 0 failed.
- `type-check:internals`, `type-check:types`, `lint:docs`, ESLint and Prettier pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

