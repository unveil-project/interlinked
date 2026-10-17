Addressed in `f5571f9`.

Serialized progress evidence now escapes `<` before byte budgeting and truncation, so an embedded closing-tag string cannot terminate the untrusted-evidence envelope. Regression coverage exercises the collision in both complete and truncated records.

The branch is rebased onto current `main` at `2b791687` with Pi 0.85.1. Post-rebase validation passes: `npm run check` (19 files / 146 tests), Pi compatibility, all-mechanisms (4/4), `git diff --check`, and the high-severity audit gate. The audit still reports the existing two moderate Vitest advisories. Please re-review the current head.
