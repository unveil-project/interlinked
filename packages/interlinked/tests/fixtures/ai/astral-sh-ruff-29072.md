## What
Fixed a doc comment on as_non_finite_float_string_literal in crates/ruff_linter/src/linter/float.rs that incorrectly said 'Returns `true`' when the function returns Option<&'static str>, contradicting its own next line and the sibling function's correct phrasing.

## Why
A small, objectively-verifiable improvement (comment) found during a
daily open-source maintenance pass (2026-10-02).

## How verified
Read the function signature (returns Option<&'static str>) and compared to the comment text and the correctly-worded sibling function's doc comment immediately above; git diff shows a single one-line change.
Automated gates: 2 changed lines across 1 files (within limits); cargo check: passed (ruff_linter).

---
Prepared with Claude Code assistance and reviewed by Aarush's
automation gates (diff-size, file-scope, deletion, and build checks)
before opening.
