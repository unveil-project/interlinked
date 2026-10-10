### What

Adds a focused e2e regression suite under `test/e2e/app-dir/next-dynamic-loading-prerender` for `next/dynamic` used inside a `'use client'` file on a fully static Cache Components route (`cacheComponents: true`).

The suite asserts the **current** behavior, so it passes on canary today:

- Without a `loading` option, `next/dynamic` does not create a Suspense boundary of its own: the lazy component's HTML is prerendered inline and the document contains no pending boundary marker. The lazy component therefore suspends the parent boundary, which keeps the whole segment dehydrated until the low-priority lazy chunk arrives.
- With `loading: () => null`, the lazy component gets its own Suspense boundary. When the lazy module is not resolved while the static shell is flushed, the component's HTML is missing from the static prerender entirely (`<!--$?-->` stays pending), so the content is not visible with JavaScript disabled.

### Notes

- Test-only change, no product code is touched.
- The last test documents behavior that is still broken. A fix is expected to flip `expect(html).not.toContain('HEAVY_DYNAMIC_CONTENT')` into the intended expectation in the same test.
- Verified locally against `next@16.5.0-canary.5` with both Turbopack and webpack in `start` mode. The suite is skipped in dev and in deployment mode because it asserts the contents of the static prerender.

### Validation

```
pnpm test-start-turbo test/e2e/app-dir/next-dynamic-loading-prerender/
pnpm test-start-webpack test/e2e/app-dir/next-dynamic-loading-prerender/
pnpm test-dev-turbo test/e2e/app-dir/next-dynamic-loading-prerender/
```

Maintainer dashboard: https://next-maintainer-agent.vercel.tools/investigations/feedback/104
DX Agent feedback: https://dxagent.labs.vercel.dev/dashboard/feedback/7cfcaeba-a24e-44b2-8659-472b46696d63

Prepared in fork: https://github.com/vercel-labs/next.js-experimental/pull/245