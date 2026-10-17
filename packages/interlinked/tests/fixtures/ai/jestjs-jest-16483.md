## Summary

In multi-project setups, projects frequently configure distinct 
ootDir, displayName, setupFiles, or other project-specific options while compiling identical source files using identical transformer settings.

PR #16331 added options.configString (the stringified project config) into createCacheKey in @jest/create-cache-key-function so that modifying transformer configuration invalidates cache entries. Because configString contains the entire project configuration, cache keys diverge across projects even when the transformer options are identical. As a consequence, transform cache sharing across projects stopped working in monorepos.

This pull request resolves the issue by:
1. Adding 	ransformerConfig?: unknown to TransformTypes.CacheKeyOptions in @jest/types.
2. Updating configStringOf in @jest/create-cache-key-function to key on 	ransformerConfig with deterministic serialization when provided.
3. Retaining fallback to options.configString when 	ransformerConfig is undefined to preserve compatibility.

Fixes #16479.

## Test plan

1. Added unit tests in packages/jest-create-cache-key-function/src/__tests__/index.test.ts verifying that projects with differing project configurations but identical 	ransformerConfig produce identical cache keys, that modifying 	ransformerConfig invalidates cache keys, and that object key order in 	ransformerConfig is deterministic.
2. Added integration test in packages/jest-transform/src/__tests__/ScriptTransformer.test.ts verifying that transform cache files are shared between multiple projects with matching transformer configuration.
3. Ran corepack.cmd yarn jest --color packages/jest-create-cache-key-function packages/jest-transform (all 110 tests passed).
4. Ran corepack.cmd yarn build:ts (clean build and validation).
5. Ran corepack.cmd yarn eslint packages/jest-create-cache-key-function packages/jest-transform packages/jest-types (clean pass with 0 errors and 0 warnings).