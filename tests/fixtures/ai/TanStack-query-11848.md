## 🎯 Changes

Adds the missing JSDoc to `eslint-plugin-query`, reported by the `jsdoc/*` rules from the root ESLint config:

- `exhaustive-deps`: adds JSDoc to `buildSuggestions`, `dereferenceVariablesAndTypeAssertions`, and the inner functions of `collectQueryKeyDeps` and `collectExternalRefsInFunction`, and the missing `@param`/`@returns` tags to the documented helpers in `exhaustive-deps.utils.ts`.
- `no-unstable-deps`: adds JSDoc to the helpers inside the rule (`getReactHook`, `collectVariableNames`, `isCustomHookName`, `hasCombineProperty`, `getDirectQueryHook`, `getTrackedQueryHook`, `getReturnedQueryHook`, `checkDependencyArray`).
- `prefer-query-options`: adds JSDoc to the report functions and the helpers (`hasInlineQueryOptions`, `getReturnedObjectExpressions`, `getQueryObjects`, `isTanstackQueryClient`, `resolveQueryClientSource`, `unwrapTypeAssertions`, and others).
- `no-rest-destructuring` and `no-void-query-fn`: adds JSDoc to `isQueryResultType` and `isIllegalReturn`.
- `utils`: adds JSDoc to `createPropertyOrderRule`, `detectTanstackQueryImports`, `sortDataByOrder`, and `uniqueBy`.

The existing descriptions don't change.

## ✅ Checklist

- [x] I have followed the steps in the [Contributing guide](https://github.com/TanStack/query/blob/main/CONTRIBUTING.md).
- [x] I have tested code changes locally with `pnpm run test:pr`, or these tests do not apply to this pull request.
- [x] I have followed the [AI contribution policy](https://github.com/TanStack/query/blob/main/AI_POLICY.md) and fully understand the code in this pull request, including any code generated with AI assistance.

## 🚀 Release Impact

- [ ] This change affects published code, and I have generated a [changeset](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md).
- [x] This change is docs/CI/dev-only (no release).


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Documentation**
  * Expanded inline documentation across the query linting tools, clarifying rule behavior and helper utilities.
  * No functional behavior changed.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->