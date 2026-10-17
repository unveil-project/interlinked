### Description

Patch and text prepared with Codex, operated by @GreedyC. @GreedyC confirmed reviewing and understanding the code and approved submission.

Resolves #11434

Select the first body match when taking a default screenshot. This avoids a strict-mode error when an open shadow root contains another body. Element and full-page screenshots are unchanged.

Add a real browser test with and without the shadow body. Without the fix, the shadow-body case has no failure screenshot attachment; with the fix, both cases pass.

### Please don't delete this checklist! Before submitting the PR, please make sure you do the following:

- [x] It's really useful if your PR references an issue where it is discussed ahead of time. If the feature is substantial or introduces breaking changes without a discussion, PR might be closed.
- [x] Ideally, include a test that fails without this PR but passes with it.
- [x] Please, don't make changes to `pnpm-lock.yaml` unless you introduce a new test example.
- [x] Please check [Allow edits by maintainers](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/allowing-changes-to-a-pull-request-branch-created-from-a-fork) to make review process faster. Note that this option is not available for repositories that are owned by Github organizations.

### Tests

- [ ] Run the tests with `pnpm test:ci`.

Local checks: `pnpm build`, `pnpm lint:fix`, `pnpm lint`, and `pnpm typecheck` passed. The Chromium `failure-screenshot` and `to-match-screenshot` suites passed all 13 tests. The full `test:ci` suite was not run. Firefox could not launch locally (`Could not find profile folder`); WebKit was not tested.

### Documentation

- [ ] If you introduce new functionality, document it. You can run documentation with `pnpm run docs` command.

No new API or functionality.

### Changesets

- [x] Changes in changelog are generated from PR name. Please, make sure that it explains your changes in an understandable manner. Please, prefix changeset messages with `feat:`, `fix:`, `perf:`, `docs:`, or `chore:`.
