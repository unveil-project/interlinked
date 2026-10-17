**Description:**

Main-branch CodSpeed runs generate the crate list successfully but skip the entire benchmark matrix because GitHub's implicit success gate considers the skipped PR-only contributor-policy ancestor. This prevented the empty baseline-refresh PR from uploading fresh main results.

Add an explicit non-cancelled condition requiring successful crate discovery so main benchmarks run when the policy ancestor is skipped. Contributor checks, benchmark commands, runner settings, and maintenance-commit skips retain their existing behavior.

Extend the existing workflow fixture suite with eight matrix scenarios covering main pushes, allowed and denied PRs, policy failures, and unsuccessful crate listing.

**Validation:**

- The new main-push regression test failed before the workflow fix and passed after it.
- All 87 contributor-policy and workflow tests passed with Node.js 24.
- `cargo fmt --all` passed.
- `cargo clippy --all --all-targets -- -D warnings` passed.
- The add-changeset inventory found no changed Rust crates or workspace release inputs; no release changeset is required.

**Related issue (if exists):**

Baseline refresh: https://github.com/swc-project/swc/pull/12475
Skipped main run: https://github.com/swc-project/swc/actions/runs/36980143139
