Fourth of the PromQL translator stack (#159986 -> #160596 -> #160468 -> this -> #160794).

Once every node the query reaches supports `esql_timeseries_metadata_unset`, a translation carries each series' one whole `_timeseries`. It unsets the labels the series' identity drops, with `TimeSeriesUnset`, right where it drops them, instead of asking the source for one `_timeseries` per exclusion set. Older and mixed clusters plan exactly as before.

**Which plan runs**
- **The gate.** `TranslationContext.supportsTimeSeriesUnset()` is true only when the minimum transport version of every node the query reaches, in the local cluster and in every remote cluster, supports `esql_timeseries_metadata_unset`. The coordinator decides once per command, and `TimeSeriesUnset` refuses to serialize to an older node.
- **Explicit branches.** Each translate function where a series' identity changes branches on the gate in plain sight, `if (context.supportsTimeSeriesUnset()) { … } else { … }`, with the previous code as the `else`:
  - `without (K)` in `AcrossSeriesAggregate`: the child carries its whole `_timeseries`, a raw child collapses per series by it, and the aggregate unsets K and regroups;
  - the `le` of a classic histogram in `HistogramFunctionCall`: the same, for `le`;
  - `ignoring (K)` in `VectorBinaryOperator`: each operand keys the join on its `_timeseries` with K unset;
  - a union in `TranslationContext`: each branch rewrites its `_timeseries` in canonical form, so loaded and edited ones compare equal in the dedup.
- **Everything else is shared.** The per-series aggregate still groups by `TimeSeriesWithout()` when it needs the identity. On the new path requirements carry no exclusion sets: `TranslationConstraint.exclude` drops labels without widening anything.

**On the new version**
- **One `_timeseries` per node.** There are no `_timeseries$…` columns and nothing is decoded from names. The source loads `_timeseries` once per relation, which also removes the source read of several `_timeseries` columns behind #160778.
- **`without` over every label** now gives the empty identity instead of the whole document. Older versions keep that bug.
- **Label removal is in the plan.** A label is unset under every field name it may be stored as (`pod`, `labels.pod`, and concrete passthrough fields such as `attributes.cpu`), because the plan can't resolve a field alias per shard the way the source does.
- **Placement.** This PR applies the edits on the coordinator; #160794 moves them to the data node, once per series.

**Verification**
- **Old version.** Translations of every csv-spec and golden PROMQL query, plus targeted probes (764 queries), are byte-identical at the version just before `esql_timeseries_metadata_unset`.
- **New version.** 45 of those queries change, every one a `without`, a histogram or an `or`. `CsvIT` passes all 1,110 PromQL csv-spec tests.
- **Tests.** A new `testSumWithout` golden keeps the old plan under `before_esql_timeseries_metadata_unset/`. `PromqlTimeSeriesUnsetTranslationTests` pins the version split, and `PromqlPlanWithoutGroupingTests` assert the new shape on the current version.

One commit; stacks on #160468.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
