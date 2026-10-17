## Summary

Fixes #16476.

CommonJS resolution currently adds `node` regardless of the test environment. When a package puts its `node` export before its `browser` export, jsdom loads the Node entry even with `customExportConditions: ['browser']` or an explicitly empty conditions array.

Remove the unconditional `node` condition and use the environment's conditions, as ESM resolution already does. The Node environment still provides `node` and `node-addons`; jsdom can explicitly opt into `node`. This also means legacy custom environments without `exportConditions()` no longer receive an implicit CommonJS `node` condition. The low-level default resolver fallback is unchanged.

Add unit and integration coverage for defaults, custom and empty conditions, `require`, `require.resolve`, dynamic import, and Node → jsdom → Node resolution in the same CLI invocation.

## Test plan

Validated on Windows with Node 24.16.0 and Yarn 4.18.0:

- `yarn build`, `yarn lint`, `yarn lint:prettier:ci`, `yarn typecheck:tests`, `yarn constraints`, and `yarn dedupe --check` pass.
- The resolve-conditions integration suite passes all 12 cases. On the unchanged base, 9 of these cases fail. The single-CLI Node → jsdom → Node fixture passes all 24 assertions; the unchanged base fails 4 assertions in the jsdom file while both Node files pass.
- The Resolution unit suite passes 30 tests without VM modules (4 capability skips). The CommonJS-only jsdom fixture also passes without VM modules (7 assertions, dynamic import excluded).
- `yarn jest --runInBand --no-cache`: 538 suites / 6,343 tests pass, 12 suites / 13 tests fail, with 281 tests skipped. All 13 failing tests were reproduced on the exact unchanged base `202dd8a14777c270607c2416bd5034c3c0abc984`; the failures concern existing path/snapshot normalization, symlink fixtures, source locations, and a watch/exit assertion. The full suite is **not green** on this host.
- `yarn check-copyright-headers` fails only on the existing symlink fixture, which Git checks out as a regular file on this host. The same checker fails on that file in a separate clean checkout of the exact base; the new fixtures are included in the candidate check.
- `yarn verify-pnp` fails before running tests because the existing script's generated Windows `yarnPath` is unescaped by `dedent`, making invalid YAML. The exact unchanged base fails at the same point.

Local subprocesses used private instrumentation to keep Windows console windows hidden; that instrumentation is not part of this change.

The changelog entry includes this PR's number and passes `yarn check-changelog 16478`. Upstream [Node CI](https://github.com/jestjs/jest/actions/runs/36883092645) passed all 94 jobs on `b7872874b60ee6919fdccbfa749b8cc7cfede655`, including the Linux, macOS and Windows test matrix and [static checks](https://github.com/jestjs/jest/actions/runs/36883092645/job/110440358718) for PnP, copyright, lint and types. The separate changelog checks also passed. EasyCLA still requires the account holder's signature.
