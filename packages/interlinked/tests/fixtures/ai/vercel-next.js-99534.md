## Summary

Capture the partial-prefetching and cached-navigation test flags in deployed configs through the shared helper introduced in #99533, matching Cache Components. The helper owns the static list of experimental flags; the deploy harness no longer sends or translates the corresponding `NEXT_PRIVATE_EXPERIMENTAL_*` aliases. The fixed `NEXT_PRIVATE_TEST_MODE=e2e` mode setup is retained.

This is the second layer of the stack. The monorepo fixtures in #99395 will use the same helper for their copied nested configs.

## Verification

- Executed generated assignments for all three flags, covering enabled/disabled values, omitted values, string escaping, and capture timing. Together with the existing deployment lifecycle suite: 41/41 unit tests passed.
- Real Vercel deployments of `test/e2e/app-dir/hello-world/hello-world.test.ts` against `16.4.0-canary.55`: 4/4 assertions passed with flags unset and 4/4 with all three flags enabled. The enabled build explicitly reported Cache Components and cached navigations enabled.
- Full bootstrap (18/18 tasks), formatting, and ESLint passed.

<!-- NEXT_JS_LLM -->
