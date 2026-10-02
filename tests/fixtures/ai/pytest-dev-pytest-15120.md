Fixes #14912.

`_pytest/deprecated.py` stored 11 deprecations as module-level warning
*instances* which call sites passed straight to `warnings.warn()`. When warnings
are configured as errors, `warn()` raises that exact object, and CPython appends
to an exception's existing `__traceback__` instead of resetting it — so the
traceback of a process-lifetime global grew with every raise.

Reproduced before the fix:

```console
$ python -c "...raise deprecated.YIELD_FIXTURE four times under -W error..."
after raise 1: traceback frames = 1
after raise 2: traceback frames = 2
after raise 3: traceback frames = 3
after raise 4: traceback frames = 4
```

After the fix:

```console
after raise 1: traceback frames = 1
after raise 2: traceback frames = 1
after raise 3: traceback frames = 1
after raise 4: traceback frames = 1
```

## Changes

- The 11 plain instances (`YIELD_FIXTURE`, `PRIVATE`, `CONSOLE_MAIN`,
  `CONFIG_INICFG`, `PASTEBIN`, `INI_STRING_TYPE_NON_STR_VALUE`,
  `MONKEYPATCH_LEGACY_NAMESPACE_PACKAGES`, `FIXTURE_BASEID_DEPRECATED`,
  `FIXTURE_NODEID_DEPRECATED`, `FIXTUREDEF_HAS_LOCATION_DEPRECATED`,
  `PARSEFACTORIES_NODEID_DEPRECATED`, `CALLSPEC2_RENAMED`) are now stored as
  `UnformattedWarning`, whose `format()` already returns a fresh instance.
- Each call site passes `.format()` to `warnings.warn()`.
- The module docstring is updated — it previously *mandated* the instance form.
- `CHANGES`-style changelog entry at `changelog/14912.bugfix.rst`.

The four `UnformattedWarning` constants were already correct, since
`.format(...)` returned a new object each time.

## Verification

Beyond the traceback measurement above, the constants are asserted to be
`UnformattedWarning` (so they have no `__traceback__` at all) and message text
and category are confirmed unchanged:

```
YIELD_FIXTURE              UnformattedWarning=True has __traceback__=False
...
category: PytestRemovedIn10Warning | is PytestRemovedIn10Warning: True
message : '_pytest.python.CallSpec2 has been renamed to CallSpec.\n...'
```

Two regression tests are added to `testing/deprecated_test.py`.

## Test suite

Run against the unmodified tree and this branch with the same command, the
result is **identical**:

```
baseline: 21 failed, 4544 passed, 125 skipped, 12 xfailed
this PR:  21 failed, 4544 passed, 125 skipped, 12 xfailed
```

The 21 failures are pre-existing environment artifacts (the checkout reports
`pytest.__version__` as `0.1.dev1+...`, which breaks `minversion` checks and a
few warning-capture tests); they are unaffected by this change. Note also that
two tests in `testing/python/collect.py` only fail when `-W ignore` is passed on
the command line — they pass with the default filter, on both trees.
