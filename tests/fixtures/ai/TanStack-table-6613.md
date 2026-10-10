## 🎯 Changes

Rows are memoized on `data`, so the core row model (and its row instances) survives a column-definitions update. `row.getValue()` cached the first computed value per column id indefinitely, which meant replacing `columns` with a new `accessorFn` kept returning stale values until `data` changed.

The fix records the `accessorFn` identity that produced each cached value in a new `_accessorFnsCache` map on the row. On a cache hit, the stored accessor is compared against the column's current accessor; a mismatch recomputes and re-caches. Same idea as the earlier #5582, reworked for the v9 row internals. `getColumn` is memoized on `options.columns`, so the extra lookup on cache hits is cheap.

Fixes #5363

Testing: added two regression tests in `coreRowsFeature.utils.test.ts` (cache invalidates when the accessor changes; no recompute while the accessor is unchanged). Full `@tanstack/table-core` unit suite: 1309/1310 pass. The single failure is the timing-sensitive `cellSpanningFeature` perf test, which also fails on unmodified main on a loaded machine. `tsc --noEmit` is clean on src and tests.

## ✅ Checklist

- [x] I have followed the steps in the [Contributing guide](https://github.com/TanStack/table/blob/main/CONTRIBUTING.md).
- [x] I have tested code changes locally with `pnpm test` and `pnpm test:e2e`, or these tests do not apply to this pull request.
- [x] I fully understand the code in this pull request, including any code generated with AI assistance.

## 🚀 Release Impact

- [x] This change affects published code, and I have generated a [changeset](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md).
- [ ] This change is docs/CI/dev-only (no release).

<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **Bug Fixes**
  * Row values now reflect updated column accessors, even when existing rows are reused. Unchanged accessors continue to benefit from cached values. If an accessor throws an error, a later request retries it.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->