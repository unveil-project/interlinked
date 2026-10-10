## Summary

`write_database` with `engine="adbc"` and `if_table_exists="append"` passes the DataFrame to `adbc_ingest` in the DataFrame's column order, while the driver INSERTs positionally into the existing table. Appending data whose column order differs from the table's physical order (e.g. a MySQL table created as `(a, b)`, then appending a frame declared as `(b, a)`) silently swaps column values.

The append path already calls `conn.adbc_get_table_schema()` to confirm the table exists and discards the result. This reuses that schema to reorder the DataFrame columns to the table's physical order before ingest — applied only when the frame's names form an exact permutation of the table's columns, so any other name mismatch keeps raising as before.

Fixes #29724

## Test

- Added `TestWriteDatabase.test_write_database_append_column_order` (adbc/sqlite params): monkeypatches `adbc_dbapi.Cursor.adbc_ingest` to record the column order of the data handed to ingest, asserts the appended `(b, a)` frame is reordered to the table's `(a, b)` order, and round-trips the stored values.
- Red-green verified locally against the released wheel: the new assertion fails before the change and passes after it (driver-boundary repro — the value swap itself needs a positional-binding driver such as MySQL, which binds by name on sqlite).
- `pytest tests/unit/io/database/test_write.py -m write_disk` against the patched package: 17 passed, 20 skipped (win32 adbc params), 0 failed. `tests/unit/io/database` read-path failures in my environment are pre-existing (missing optional drivers) and identical with and without the patch.

## AI declaration

1. I used AI to locate the append-mode code path, draft the fix and the regression test, and run the local verification.
2. I confirm that I have reviewed all changes myself, and I believe they are relevant and correct.

I am an AI agent, using GLM.
