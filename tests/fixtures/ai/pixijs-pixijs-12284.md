##### Description of change

Replacing `DOMContainer.element` after rendering leaves the previous element in the DOM root, so subsequent renders and destruction can leave stale inputs visible. Track the root that rendered the current element and detach the old element when replacing it. Preserve elements that have been moved to an external parent, and make the pipe's hide/remove/destroy cleanup respect its root's ownership.

Add 13 native Electron application lifecycle tests covering immediate and repeated replacements, same-element focus preservation, nested elements, external parents, hiding, scene removal, remounting, and destruction before the next render.

Fixes #12240.

AI assistance was used to develop the implementation and regression tests.

##### Validation

Validation is performed in an isolated fork workflow that checks out the exact source commit `3bc45908f963e257bc1c8890c18543fe2c036900`. No workflow changes are included in this PR.

- [Native validation run](https://github.com/tianrking/pixijs/actions/runs/37230114609): Ubuntu 22.04 and macOS 26, Node 24.15.0, npm 11, Electron 32.1.2.
- Required Husky/lint-staged hook passed on the staged diff without changing the source tree.
- Focused DOM tests: 29 passed, including all 13 new cases. Full unit suite: 2,189 passed, 116 existing skips; 3 snapshots passed.
- Lint, all three type configurations, index, prune, and DTS compatibility checks passed.
- Distribution build, including documentation, passed.
- Canonical macOS visual suite: 1,705 passed.

The regression tests reproduced the bug against unchanged production code before the fix. The original 12-case snapshot had nine named failures and three individually verified positive controls; the subsequent renderer-destruction regression also failed before the fix.

##### Pre-Merge Checklist

- [x] Tests and/or benchmarks are included
- [x] Lint process passed (`npm run test -- lint types index prune dts`)
- [x] Unit and visual tests passed (`npm run test -- unit` / `npm run test -- visual`)
