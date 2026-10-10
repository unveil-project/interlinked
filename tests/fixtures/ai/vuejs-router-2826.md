`createMemoryHistory().go()` clamps the position to the stack, but it still calls the listeners with the delta that was requested, even when the position didn't change at all. The router then treats that as a real pop navigation, and when a guard aborts it, it reverts with `go(-info.delta, false)`, which moves the memory history to an entry the user never left.

Minimal repro:

```ts
const history = createMemoryHistory()
const router = createRouter({ history, routes })
await router.push('/')
await router.push('/a')
await router.push('/b')

router.beforeEach(() => false)
router.forward() // already on the last entry

// guard ran for /b -> /b, aborted, router called history.go(-1, false)
router.currentRoute.value.fullPath // '/b'
history.location // '/a'
```

The same desync happens with `router.go(0)` (the router reverts the aborted pop with `go(-1, false)` for a zero delta) and when going past the end from the middle of the stack: from `/a` above, `router.go(5)` lands on `/b`, the guard aborts, and `go(-5, false)` clamps back to `/` instead of `/a`.

The fix computes the delta from the position before and after clamping, reports that one to the listeners, and skips them when it is 0. That matches what `RouterHistory.go()` documents (`go(1)` is equivalent to `window.history.forward()`): a browser fires no popstate when there is nothing to go to. The clamping itself is unchanged.

Tests:
- `memory.spec.ts`: listeners aren't called when the position doesn't move (`go(-1)` at the start, `go(1)` at the end, `go(0)`), and an overshooting `go()` reports the traveled delta.
- `router.spec.ts`: `router.forward()` from the last entry doesn't run guards, and an aborted `go(5)` from the middle leaves both `currentRoute` and the history on the original entry.
- `errors.spec.ts`: the `testHistoryNavigation` / `testHistoryError` helpers only pushed one location (the first navigation replaces the initial entry), so their `history.go(-1)` relied on this phantom navigation. They now push `/` first, like the `triggers afterEach with history.back` test above them, so they go through an actual back navigation.

Without the source change, the 4 new tests fail (the forward guard is called once; the aborted `go(5)` leaves the history on `/` while the route is `/foo`). Full router suite, `pnpm run lint`, `pnpm run build` and `pnpm run test:types` pass.


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Bug Fixes**
  * Memory-history navigation now avoids notifying listeners when the history position doesn’t change.
  * Navigation beyond history boundaries reports the distance actually traveled, and aborted navigation restores the current route and history position.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->