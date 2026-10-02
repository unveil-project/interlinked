## What this changes

`scripts/change_detector.py`'s `PATTERNS` groups changed files by project area (`python` means "under `superset/`, `scripts/`, `tests/`, ..."; `frontend` means "under `superset-frontend/`"). That's the right signal for gating CI jobs by area, but it isn't a language classifier: a `.js` file living outside `superset-frontend/` -- e.g. `superset/mcp_service/index.js`, or a `.js` file under `scripts/` -- is grouped under `python` by `PATTERNS`, not `frontend`.

That gap was flagged during review of #44699, which wanted to reuse the `python`/`frontend` groups as a stand-in for "which CodeQL language(s) changed": https://github.com/apache/superset/pull/44699#discussion_r4133227541. Reusing a directory-based group as a language signal silently drops a JavaScript file that doesn't live under `superset-frontend/`. #44822 was opened to track it.

This PR adds a standalone, independent fix: `detect_languages()` classifies files by extension (`.py` -> `python`; `.js`/`.jsx`/`.ts`/`.tsx`/`.mjs`/`.cjs` -> `javascript`) regardless of directory, and `main()` now also writes a `languages` JSON-array output (e.g. `languages=["javascript", "python"]`) alongside the existing group outputs. The existing `PATTERNS` groups and their outputs (`python`, `frontend`, `docker`, `docs`, `superset-extensions-cli`) are untouched -- this is additive, so nothing that currently consumes those outputs changes behavior. The `languages` output is meant to be picked up by a future CodeQL `lang_matrix` step (e.g. once #44699 lands/is rebased), without this PR needing to touch that workflow itself.

Per [issue #44822](https://github.com/apache/superset/issues/44822#issuecomment-5926427475) and [hainenber's go-ahead](https://github.com/apache/superset/issues/44822#issuecomment-5954244193), this targets `master` independently of #44699. It does not touch the separate push-range bug also tracked under #44822, which #44833 already covers.

## Failure modes

- A `.py` file anywhere -> `languages` includes `python`; `PATTERNS["python"]` groups it the same as before (unchanged).
- A `.js`/`.ts`/`.jsx`/`.tsx` file under `superset-frontend/` -> `languages` includes `javascript`; `PATTERNS["frontend"]` groups it the same as before (unchanged).
- A `.js` file **outside** `superset-frontend/` (e.g. `superset/mcp_service/index.js`) -> `languages` now correctly includes `javascript`, even though `PATTERNS["python"]` still groups it under `python` (unchanged, since that's a separate directory-based signal still used for CI gating).
- A file with an unmapped extension (`.md`, `Dockerfile`, `.yml`, ...) -> contributes nothing to `languages`.
- `workflow_dispatch`/`schedule` runs (`files is None`) -> `languages` returns every known language, matching the existing "assume everything changed" behavior for the `PATTERNS` groups.
- A push/PR touching >= 99 files (the existing 100-file GitHub API cap workaround) -> `languages` also returns every known language, so a consumer combining both outputs never sees a language silently excluded by the cap.

## Verification

Added four new tests to `tests/unit_tests/scripts/change_detector_test.py` covering: the outside-`superset-frontend/` `.js` gap itself (and that it's still true `PATTERNS` doesn't fix it, which is why this is a separate signal), mixed Python+TypeScript changes, unmapped extensions, and the `None`/"assume everything changed" case. All existing tests in that file are unchanged.

Not run locally (no Python toolchain in my environment); the logic was sanity-checked standalone against the same inputs as the new tests before opening this PR. Please run CI -- happy to address any findings.

Fixes #44822 (the language-classification half; the push-range half is already covered by #44833, left untouched here).
