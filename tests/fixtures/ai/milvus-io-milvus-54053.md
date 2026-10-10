## Summary

- Decode persisted TEXT LOB references into a temporary Arrow String view for missing BM25 and MinHash backfill outputs.
- Preserve original TEXT LOB references and files in additive and same-partition-base rewrite paths; retain existing legacy-path rewrite behavior.
- Consolidate TEXT function admission and add native, Go, and Python regression coverage.
- Simplify the native decoder by relying on pinned milvus-storage Vortex take() bounds validation, while retaining output length, nullity, and UTF-8 checks. Add a mixed valid/out-of-range batch regression test.

## Related issues

- Related: #50021, #51167

## Verification

- After this simplification: C++ build/install and native TextLOBDecoder standalone test passed.
- Full internal/datanode/compactor package passed again (175s) with `-tags dynamic,test` and `-gcflags=all=-N -l`; directed mixed-batch out-of-range regression passed.
- Focused packed TEXT LOB decoder tests passed. Earlier focused function, validator, Proxy, and RootCoord tests passed with the same Go flags.
- Ruff check, Ruff format check, and py_compile passed for changed Python tests.
- Python API E2E still needs bm25s and a controlled StorageV3 instance. The unfiltered function package previously hit an invalid-analyzer native abort outside the touched code; it is not claimed green.