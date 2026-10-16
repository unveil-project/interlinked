Thanks for catching this — updated in 6748c73 and rebased onto current `main`, including #39.

- The matrix now tests Node 22 and 24; Node 20 is removed.
- Since the Vitest script is now present on `main`, I also removed the stale pre-#39 comment and changed the step from `npm run --if-present test` to `npm test`, so CI cannot silently skip the suite if the script disappears.

Verified locally on Node 22:
- `npm ci`
- `tsc -b`
- production build
- 20/20 Vitest tests
- workflow YAML parse
- `git diff --check`

Fresh CI is running now; its Node 24 job will provide the second runtime check. Thanks again for the precise compatibility note.
