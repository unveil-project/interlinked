## Summary

Add direct unit test coverage for `fastapi.utils.is_body_allowed_for_status_code`.

This small helper decides, per the OpenAPI Specification's patterned fields, whether responses may carry a body. It is used by `fastapi/exception_handlers.py` and `fastapi/openapi/utils.py`, but it had no direct test coverage: the `204/205/304` (and `1XX` numeric edge) behaviour was only pinned implicitly through request-level tests.

The new file `tests/test_is_body_allowed_for_status_code.py` pins three groups of expectations:

- `None` and the patterned codes `default`, `1XX`, `2XX`, `3XX`, `4XX`, `5XX` allow a body.
- `100`, `199`, `204`, `205`, `304` (as `int` and as `str`) do **not** allow a body.
- All other regular codes (`200`, `201`, `300`, `301`, `302`, `400`, `404`, `500`, incl. string forms) allow a body.

Behaviour tested is the current implementation (comment in the source already references the OpenAPI spec); no production code is changed.

## Verification

- `uv run pytest tests/test_is_body_allowed_for_status_code.py -q` → `29 passed in 0.34s`
- `uv run ruff format --check tests/test_is_body_allowed_for_status_code.py` → `1 file already formatted`
- `uv run ruff check tests/test_is_body_allowed_for_status_code.py` → `All checks passed!`

AI assistance disclosure: this test file was produced with AI assistance and reviewed before submission.
