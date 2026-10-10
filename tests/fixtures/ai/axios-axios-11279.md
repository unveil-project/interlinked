## Current status — 8 October 2026

This PR remains draft while required browser validation is incomplete. The changelog conflict is now resolved in published head `bffd21bace3e3f0e1768480fdd93dda98a5546c1`.

The independently reviewed published merge, `bffd21bace3e3f0e1768480fdd93dda98a5546c1`, combines previous public head `b10b4099ebe46d3ce5ceb7a3580918db8487197b` with upstream `1a94bdbdf0518f3adbeada510b747aff80847ed7`. It retains every upstream changelog entry and this PR's entry once; the original contribution's source/test files are byte-identical. The public tree and both merge parents were verified after publication; the merge author and committer use `thinkelite@hotmail.com`. No source, dependency or workflow changes were added to hide failures.

On this **published merged tree**, Node 26.10.0/npm 11.19.1: `npm ci --ignore-scripts`, changelog formatting, `npm run lint` and `npm run build` pass. `npm run test:vitest:unit`: **1519 passed**. `npm run test:vitest:browser:headless`: **not green** — 835 passed, three skipped, two failures in the existing ReDoS wall-clock assertion (Chromium 50.3 ms and Firefox 24 ms against 20 ms). A focused unchanged-upstream run also fails the Firefox assertion (30 ms); isolated candidate runs pass all three browsers. These diagnostics do not turn the complete run into a pass.

The complete suites used default repository commands with no test suppression or retry flags. Earlier results below refer to the previous base and do not establish readiness of this merge candidate. Required upstream CI and write-access maintainer approval remain outstanding. A maintainer still needs to apply `ai-assisted`.


Exact-head GitHub Actions refreshed after publication: Bundle Size: action_required; Continuous integration: action_required; GitHub Actions Security Analysis with zizmor: action_required; Verify build reproducibility: action_required. Authorization-required or queued workflows are not executed test passes. Automated review checks are not maintainer approval.

---

## Original implementation and earlier validation

## Summary

Keep custom FormData visitor helpers local to each serialization call. A visitor that invokes nested `toFormData` and then delegates through `helpers.defaultVisitor` currently sends its outer fields into the nested FormData, leaving the outer result empty.

## Linked issue

No linked issue. The regression is reproduced by an outer `{ numbers: [1, 2] }` serialization with `indexes: true` whose visitor serializes `{ nested: [3, 4] }` with `indexes: null`. Both results now contain only their own fields, using their own options.

## Changes

- Create a fresh helper object instead of mutating the shared predicates object.
- Add two native FormData regressions checking both destinations with opposite index settings.
- Add the required Bug Fixes entry in `PRE_RELEASE_CHANGELOG.md`.

## Validation

Node v24.19.0, npm 10.9.4:

- `npm ci --ignore-scripts`: passed.
- New regression cases: both fail before the fix; the focused suite passes all 30 tests afterward.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:vitest:unit -- --maxWorkers=2`: 69 files, 1,292 tests passed.
- Public `axios.toFormData` reproduction, Prettier checks, and `git diff --check`: passed.

This allocation-only helper change does not alter adapters or browser capabilities, so the browser matrix is not applicable. Exports, packaging, and declarations are unchanged, so packed-package and type/module suites are not applicable. Generated bundles are not committed.

GitHub Actions on published head `b10b4099ebe46d3ce5ceb7a3580918db8487197b`: Continuous integration, Verify build reproducibility, Bundle Size, and GitHub Actions Security Analysis with zizmor are all `action_required` (awaiting maintainer authorization), checked 2 October 2026 UTC. These are not passing CI results; local validation is recorded separately above.

Review follow-up: the nested fixture now serializes once across two outer fields. All 30 focused tests, source lint, and formatting pass; independent review verified that both revised cases still fail against the original helper implementation. The production fix is unchanged. Details: https://github.com/axios/axios/pull/11279#discussion_r4170352510

## Compatibility and documentation

Patch-level bug fix restoring the existing custom visitor contract. No public API or intentional breaking change; no deferred docs or ESM/CJS declaration changes are needed. The prerelease changelog is included.

#### Checklist

- [x] Scope, target branch, and linked issue/rationale checked
- [x] `PRE_RELEASE_CHANGELOG.md` entry added or updated (or AGENTS.md's automated release-preparation exception explained)
- [x] Regression tests and relevant negative/platform cases covered (or N/A with reason)
- [ ] Applicable local checks pass for the current merge candidate — see the 8 October blocker above
- [x] Deferred release docs and ESM/CJS types/tests updated where needed (or N/A with reason)
- [x] Semver impact stated and intentional breaking changes explained
- [x] Final diff reviewed for security, unrelated changes, generated artifacts, and test/debug leftovers
- [x] Latest GitHub Actions status recorded separately from review/security bot results

Prepared with AI assistance and independently reviewed. A maintainer needs to apply the existing `ai-assisted` label if contributor permissions do not allow it.




<!-- This is an auto-generated description by cubic. -->
---
## Summary by cubic
## Description

Fixes FormData custom visitor helpers being shared across serialization calls. A visitor that invokes nested `toFormData` and then delegates through `helpers.defaultVisitor` previously redirected outer fields into the inner FormData and left the outer result empty because the serializer mutated a shared predicates object.

- Creates a fresh helpers object per `toFormData` call instead of mutating the shared predicates object.
- Nested and outer FormData results now each contain only their own fields using their own options.
- Adds two regression tests covering opposite `indexes` settings for the outer and inner serialization (native FormData only).
- Adds a Bug Fixes entry in `PRE_RELEASE_CHANGELOG.md` and merges the latest `v1.x` while preserving that entry.

No public API or behavior change beyond restoring the existing visitor contract.

## Docs

No documentation updates needed; this restores existing behavior.

## Testing

Adds two parameterized regression cases to `tests/unit/toFormData.test.js` that fail before the fix and pass after. Lint, build, and the full Vitest unit run pass; browser, packed-package, and type/module suites are not affected since the change is allocation-only.

## Semantic version impact

Patch-level change for `v1.x`. No breaking API changes.

<sup>Written for commit bffd21bace3e3f0e1768480fdd93dda98a5546c1. Summary will update on new commits.</sup>

<a href="https://cubic.dev/pr/axios/axios/pull/11279?utm_source=github" target="_blank" rel="noopener noreferrer" data-no-image-dialog="true"><picture><source media="(prefers-color-scheme: dark)" srcset="https://www.cubic.dev/buttons/review-in-cubic-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://www.cubic.dev/buttons/review-in-cubic-light.svg"><img alt="View guided diff" src="https://www.cubic.dev/buttons/review-in-cubic-light.svg"></picture></a>

<!-- End of auto-generated description by cubic. -->






