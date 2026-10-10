Written by Codex on behalf of @mikamikasuki; the patch has been reviewed by @mikamikasuki.

### Description

Resolves #11474

When diff formatting compares an expected key against a cloned instance, it can read an inherited getter on a clone that no longer has the class's private-field brand. Skip keys that are not own properties of the cloned actual value so the assertion diff can be rendered instead of throwing a TypeError.

- [x] The PR references the issue where the bug is discussed.
- [x] The regression test fails on the unmodified main branch and passes with this fix.
- [x] `pnpm-lock.yaml` is unchanged.
- [x] Allow edits by maintainers is enabled.

### Tests

- [x] `CI=true pnpm --filter @vitest/test-unit exec vitest run --project threads test/diff.test.ts test/replace-matcher.test.ts test/expect.test.ts test/jest-expect.test.ts`
- [x] `pnpm build`
- [x] `pnpm typecheck`
- [x] `pnpm lint:fix` and `git diff --check`
- [ ] `pnpm test:ci` (not run)

### Documentation

No documentation changes are needed for this bug fix.

### Changesets

The `fix:` PR title supplies the generated changelog entry.