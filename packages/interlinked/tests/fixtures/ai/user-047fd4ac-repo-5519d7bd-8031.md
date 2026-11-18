## Stack

| PR | What |
| --- | --- |
| 👉 **this** | Keep what changes while a request is in flight |
| [#8032](https://github.com/trpc/trpc/pull/8032) | `ssr: false` for queries only a browser can run |

## Why

- A request's answer overwrote the entry when it landed. A `setData` (optimistic update) made during a background refetch flipped back to older data.
- An `invalidate()` during a request joined it, and its older answer cleared the invalidation. A mutation could resolve showing data read before it.

## What

- A `setData` or `hydrate` write made while a request runs keeps its data; the late answer is dropped. A first load in flight settles with the write.
- An invalidation made while a request runs leaves its answer stale. `invalidate()` waits for it, then refetches the entries on screen, and resolves after that.
- Fixes a flaky dom test that invalidated before React's mount effect ran (separate commit).

## Links

- [`experimental-react.md` › Cache methods](https://github.com/trpc/trpc/blob/fix/react-keep-writes-during-requests/www/v12/docs/integrations/experimental-react.md): one paragraph. Preview URLs not generated here.

## Alternatives considered

- Abort the request in flight on `invalidate()`: it would also drop the request a loader shares.

## Testing

- `index.test.ts`: "a write made while a request is in flight keeps its data over the late answer" fails without the fix.

## AI model

Claude, via Claude Code.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_019Un67eXJphvS2ZoXwSMsBt