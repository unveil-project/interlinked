Fixes #7830

## Description of changes

- Improvements & Bug fixes
  - `normalize_embeddings` now treats NumPy integer/float scalars (`np.float32`, `np.float16`, `np.int32`, `np.int64`, ...) like Python `int`/`float` when embeddings are passed as lists, e.g. `[list(v) for v in arr]` or `list(arr)`. Previously these raised `ValueError`, while `np.float64` worked only because it subclasses `float`. Bools are still rejected.
  - Affects `add`/`upsert`/`update`/`query` and `EmbeddingFunction` output normalization.

## Test plan

- [x] Tests pass locally with `pytest` for python
  - New `test_normalize_embeddings_accepts_lists_of_numpy_scalars` (float16/float32/int32/int64; single and batched) fails before the change, passes after; `test_normalize_embeddings_rejects_bools` guards the bool exclusion.
  - `CHROMA_RUST_BINDINGS_TEST_ONLY=1 pytest chromadb/test/api/test_types.py chromadb/test/property/test_embeddings.py chromadb/test/test_api.py chromadb/test/api/test_collection.py` → 298 passed, 9 skipped.

## Migration plan

None; only previously-rejected inputs are now accepted. Output is still float32 ndarrays.

## Observability plan

N/A

## Documentation Changes

None needed.

Disclosure: found, reproduced and the draft fix tested locally with the help of an AI coding agent (Claude Code); reviewed before filing.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
