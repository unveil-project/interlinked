Fixes #3736.

When a parent `<Suspense>` re-renders, the inner `<Suspense>` with the same `id` reuses the existing `ctx.suspense[id]` entry — including its stale `completed` closure that captured the **first render's** `runSuspense` and `done`. When the inner boundary later resolves it re-runs the stale subtree, emitting wrong HTML.

The fix preserves the `resources` Map across re-renders (correct — registered resources remain valid) while reassigning `completed` on every call so it always closes over the current render's `runSuspense` and `done`.

```ts
// before: completed is only set on first render
ctx.suspense[id] = {
  resources: new Map(...),
  completed: () => { /* captures first render's runSuspense/done */ }
}

// after: completed is reassigned every render
value.completed = () => {
  const res = runSuspense();        // always current render's scope
  if (suspenseComplete(value)) {
    done!(resolveSSRNode(escape(res)));
  }
};
```
