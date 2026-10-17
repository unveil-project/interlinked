`TRY_CAST` from VARCHAR to GEOMETRY only handled one kind of malformed WKT: trailing text after a valid geometry. Every other parse error (missing parentheses, unknown geometry type, missing numbers, ...) was thrown from the WKT parser as an `InvalidInputException`. That surfaced as an internal error because the cast is not fallible:

```sql
SELECT TRY_CAST('POINT(1 2' AS GEOMETRY);
-- INTERNAL Error: Scalar function "__cast" threw an execution error, but the function is not marked as fallible ...
SELECT TRY_CAST(['POINT(1 2)', 'POINT('] AS GEOMETRY[]);   -- same
```

For the same reason, CSV `ignore_errors` / `store_rejects` and `COPY ... (IGNORE_ERRORS)` did not skip rows with malformed WKT.

When the caller collects cast errors (`parameters.error_message` is set), `TryCastToGeometry` now catches the parse error, records it as the cast error, and returns `false`. `TRY_CAST` then returns NULL, and the CSV reader skips or rejects the row. A plain `CAST` is unchanged and still throws the precise parse error, including its position in the query:

```
Invalid Input Error: Failed to parse geometry: Expected ')' but got end of input at offset 9
```

Tested with the new `test/sql/types/geo/geometry_try_cast_malformed.test`, which fails without this change, plus `test/sql/types/geo/*`, `test/sql/cast/*`, `test/sql/sql_export/*` and `test/sql/copy/csv/rejects/*`.
