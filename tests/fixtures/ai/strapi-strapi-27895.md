### What does it do?

Makes `useFetchClient` (`@strapi/admin`) work when the component using it is rendered inside `<React.StrictMode>`.

- In the effect setup, if the hook's `AbortController` was already aborted, it is replaced with a fresh one. The cleanup still aborts, so a real unmount keeps cancelling in-flight requests.
- The memoised client is created with a `signal` getter (`get signal() { return controller.current?.signal; }`). `getFetchClient` already reads `defaultOptions.signal` on every request, so each request picks up the current controller's signal instead of the one captured at first render.

`getFetchClient` is unchanged, and the hook's public API (`{ get, post, put, del }` and their types) stays the same.

### Why is it needed?

In development, StrictMode mounts a component, runs the effect cleanup once as a test, then mounts it again. The cleanup aborted the controller. On remount the ref was not `null`, so no new controller was created, and the memoised client stayed bound to the aborted signal. Every request from that component then rejected immediately with `AbortError` and showed as "(canceled)" in DevTools.

For example, a plugin page wrapped in `<StrictMode>` that checks permissions with `get('/admin/users/me/permissions')` gets a cancelled request, and a Super Admin sees "You don't have the permissions to access that content". Production builds are not affected, because StrictMode's double mount only happens in development.

### How to test it?

Two tests were added to `packages/core/admin/admin/src/hooks/tests/useFetchClient.test.tsx`:

1. Render the hook with `renderHook` and `wrapper: React.StrictMode`, call `get(...)`, and assert it resolves with data. This test fails on the current code with `AbortError: This operation was aborted`.
2. Under StrictMode, start a request to an MSW handler that never responds, call `unmount()`, and assert the request rejects with `AbortError`. This makes sure a real unmount still aborts.

```bash
cd packages/core/admin
yarn test:front admin/src/hooks/tests/useFetchClient.test.tsx
```

To check manually, wrap any admin plugin page that calls `useFetchClient` in `<React.StrictMode>`, run the admin in development, and confirm the requests complete instead of showing as "(canceled)".

### Related issue(s)/PR(s)

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
