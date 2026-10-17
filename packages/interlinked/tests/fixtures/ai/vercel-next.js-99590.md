## Summary

Follow-ups to the `ensureStatic` reference from dogfooding `ensureStatic` on `vercel/shop` for 16.4.

- **`'shell'` costs:** with `'shell'`, a `<Link prefetch={true}>` into a route that reads `cookies()`, `headers()`, or URL data still makes a runtime per-link prefetch. Each visible link triggers a server render, and nothing in the UI shows it. The `'shell'` section now says so and points to `'prefetch'`.
- **Fallback shell on first visit:** under `'prefetch'`, a per-link prefetch for params not returned by `generateStaticParams()` serves the fallback shell until the page is generated in the background. On a fresh deployment, the first navigation to those URLs can show the shell. The `'prefetch'` section now explains this and links the ISR guide.
- **`ensureStatic` is not a stage API:** removing `await navigation()` because the route set `'prefetch'` moved synchronous IO (`crypto.randomUUID()` in a request helper) into earlier stages. A new "How `ensureStatic` differs from `prefetch()` and `navigation()`" section explains that `ensureStatic` validates which stages are static but does not move code.

The changes are insertions only and merge cleanly with #99493, which edits nearby lines in the same file.

## Verification

- `'shell'` deopt to runtime per-link prefetches: `dynamic-rendering-utils.ts` clears `shouldAttemptStaticPrefetch` for session and URL data unless the level is at least `Prefetch`, and the client sends `next-router-prefetch: 2` (`FetchStrategy.PPRRuntime`) in that case
- Fallback for unlisted params under `'prefetch'`: the fallback-upgradeable branch in `dynamic-rendering-utils.ts` skips the runtime request when the level is at least `Prefetch`
- Synchronous IO interrupting non-dynamic stages with Partial Prefetching: `io-utils.tsx` and `SyncIOMode.AllowedInDynamic` in `staged-rendering.ts`
- Prettier and `alex` pass on the changed file

🤖 Generated with [Claude Code](https://claude.com/claude-code)

<!-- NEXT_JS_LLM -->
