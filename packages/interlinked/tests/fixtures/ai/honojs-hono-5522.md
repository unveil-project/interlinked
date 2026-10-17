## Summary
Keep TrieRouter and LinearRouter consistent with RegExpRouter and PatternRouter for middle wildcards. A route such as `/a/*/b` should require a non-empty segment, but currently matches `/a//b` in TrieRouter and LinearRouter.

This change rejects empty middle wildcard segments and preserves trailing wildcard behavior.

## Validation
- `pnpm run build`
- `pnpm run check` (0 errors; existing warnings)
- `env -u NO_COLOR FORCE_COLOR=1 pnpm run test` (5,208 passed, 44 skipped)
- The shared router regression failed before the fix in TrieRouter and LinearRouter, then passed for all four routers.

### The author should do the following, if applicable

- [x] Add tests
- [x] Run tests
- [ ] `pnpm run check:fix` to format and lint the code
- [ ] Add TSDoc/JSDoc to document the code