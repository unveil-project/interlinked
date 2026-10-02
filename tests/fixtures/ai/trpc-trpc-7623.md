## 🎯 Changes

Bug fix. `getQueryKeyInternal` checks `!input` when it builds an `any` key, so every falsy input (`0`, `false`, `''`, `null`) gets treated as "no input" and left out of the key:

```ts
getQueryKeyInternal(['post', 'byId'], 0, 'any');
// before: [['post', 'byId']]
// after:  [['post', 'byId'], { input: 0 }]
```

In `@trpc/react-query`, `invalidate`, `refetch`, `reset` and `cancel` on the utils all build `any` keys, and so does `getQueryKey(proc, input)` when no type is passed. So `utils.post.byId.invalidate(0)` currently invalidates every `post.byId` query instead of just the one for id 0. The same goes for `refetch(false)`, `reset('')` and so on. Any truthy input works as expected.

`@trpc/tanstack-react-query` has a copy of the same helper. There `subscriptionOptions` is the only caller that passes an input with type `any`, so the effect is smaller: a falsy input gets the same subscription key as no input.

The fix only skips the input when it is `undefined`, which matches what the final branch of the same function already does (`typeof input !== 'undefined'`). Calls with no input, like `utils.post.invalidate()`, `pathKey()` and mutation keys, still produce the bare path key.

One behaviour change to note: `invalidate(null)` on a procedure whose input is nullable used to match every query of that procedure. Now it matches only the query with input `null`, the same way `useQuery(null)` builds its key.

Tests:
- unit tests in both packages check that `0`, `false`, `''` and `null` stay in an `any` key
- an integration test in `invalidateQueries.test.tsx` renders `count('')` and `count('test')`, calls `utils.count.invalidate('', { refetchType: 'none' })`, and checks that only the `''` query is invalidated

With the source change reverted, all three tests fail. The integration test fails on `expect(isInvalidated('test')).toBe(false)` (it gets `true`).

## ✅ Checklist

- [x] I have followed the steps listed in the [Contributing guide](https://github.com/trpc/trpc/blob/main/CONTRIBUTING.md).
- [ ] If necessary, I have added documentation related to the changes made.
- [x] I have added or updated the tests related to the changes made.


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

- **Bug Fixes**
  - Query inputs such as `0`, `false`, an empty string, and `null` are now preserved instead of being treated as absent.
  - Invalidating a query with an empty-string input now targets the correct query without affecting queries with other inputs.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->
