## Description of changes

Malformed persisted HNSW element counts or a truncated length.bin could reach native loading without these checks. This validates the current count against capacity and checks the expected length.bin size before loading, returning DataLoss for invalid persisted state.

- Improvements & Bug fixes
  - Validate persisted element-count bounds and length.bin size.
- New functionality
  - None.

Related work: open PR #7846 covers broader persisted HNSW validation; this PR focuses on the element-count and length.bin size checks in this change.

## Test plan

- [ ] Tests pass locally with `pytest` for python, `yarn test` for js, `cargo test` for rust
- `rustfmt --edition 2021 --check rust/index/src/hnsw.rs` and `git diff --check` passed. The focused Cargo regression test could not reach compilation because the required `googleapis/googleapis` submodule is unavailable.

## Migration plan

No migration is required; the persisted format is unchanged.

## Observability plan

Malformed persisted data returns a `DataLoss` error. No new instrumentation is added.

## Documentation Changes

No documentation files changed.

Fixes #7069