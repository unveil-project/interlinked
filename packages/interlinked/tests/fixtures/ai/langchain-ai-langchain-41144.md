Fixes #41025

`retry_on=SomeError` currently treats an exception class as a predicate because exception classes are callable. Match exception types before evaluating callable filters so unrelated model and tool failures are re-raised without retrying.

Added regression coverage for both retry middleware paths. Focused tests: 66 passed. Ruff and diff checks passed.

Thanks, Gerard Recinto
