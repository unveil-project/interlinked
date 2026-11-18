<!-- CURSOR_AGENT_PR_BODY_BEGIN -->
Closing the command menu called `setOpen(false)`, and `setOpen` always ran `init()`, which mounts the lazy `CommandMenu`. So the first close (e.g. a shallow `routeChangeComplete` from switching schema in the Table Editor on Next, or the load-time `onResolved` on TanStack) mounted the menu and its hooks fetched api keys, project settings, the projects list, secrets, auth/storage config and integrations. Reproduces on master, found while testing #52016.

The menu and its queries now load on first open instead (on TanStack that used to happen at page load).

**Changed:**
- `viewState.ts` – `setOpen` only calls `init()` when opening
- `CommandProvider.tsx` – add `completeNavigation` to the listener effect deps
- `SqlEditor.Commands.tsx` – treat mounting while open as just opened, so the first Cmd+K still prefetches tables

**Added:**
- `viewState.test.ts` – closing doesn't initiate a never-opened menu, opening does
- `CommandProvider.navigation.test.tsx` – a real or shallow completion leaves a never-opened menu unmounted and closes an open one. Fails without the fix.
- `SqlEditor.Commands.test.tsx` – mounting while open prefetches tables

## To test

- Table Editor, open DevTools Network, switch schema (e.g. public to auth) – only the schema's pg-meta queries fire, no api-keys, settings, projects or integrations requests
- Load a project and navigate via the sidebar before opening Cmd+K – none of those requests
- Cmd+K – the menu opens, its commands work, and the first open fetches tables
- Navigate via a command – the menu closes
- With the menu open, follow a shallow path change (e.g. open another SQL snippet) – the menu closes
- Repeat locally on TanStack (`pnpm dev:studio`)

<!-- CURSOR_AGENT_PR_BODY_END -->

<div><a href="https://cursor.com/agents/bc-4c050997-e4e4-51eb-98e2-b67e470e41b4?cursor_ref=pr_footer&cursor_cta=open_in_web"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/assets/images/open-in-web-dark.png"><source media="(prefers-color-scheme: light)" srcset="https://cursor.com/assets/images/open-in-web-light.png"><img alt="Open in Web" width="114" height="28" src="https://cursor.com/assets/images/open-in-web-dark.png"></picture></a>&nbsp;<a href="https://cursor.com/background-agent?bcId=bc-4c050997-e4e4-51eb-98e2-b67e470e41b4&cursor_ref=pr_footer&cursor_cta=open_in_cursor"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/assets/images/open-in-cursor-dark.png"><source media="(prefers-color-scheme: light)" srcset="https://cursor.com/assets/images/open-in-cursor-light.png"><img alt="Open in Cursor" width="131" height="28" src="https://cursor.com/assets/images/open-in-cursor-dark.png"></picture></a>&nbsp;</div>
