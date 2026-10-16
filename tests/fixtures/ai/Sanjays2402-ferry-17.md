`tests/test_worker.py` does `from tests.conftest import run_until`. That only resolves under `python -m pytest`; CI runs plain `pytest`, which does not put the repository root on `sys.path`, so the whole suite failed at collection (`ModuleNotFoundError: No module named 'tests'`) on every Python version.

**Expected:** the suite runs under plain `pytest`.

**Fixed in** [26f04e7](https://github.com/Sanjays2402/ferry/commit/26f04e70917ddaf072ae644a0cac93a213872995).
