Switching schema in the Table Editor could bounce you back into the last table on Back, and `/editor?schema=auth` opened the last table even when it lived in another schema. The last-table redirect on `/editor` now runs once per project and is skipped on Back/Forward, including a full-page Back/Forward, and an explicit `?schema=` is respected.

A schema switch replaces the query (unchanged from master, now explicit), so the open table and its tab stay put and Back leaves the editor. `/editor` with no id still opens the last table. `/editor?schema=X` opens it only when the last table is known to be in `X` (from an open tab's metadata; a history id with no tab keeps the list).

**Changed:**

- `lib/table-editor-redirect.ts`: the last-table redirect decision, with the explicit-schema rule
- `lib/history-traverse.ts`: tracks whether the current navigation is a Back/Forward, settled from router events (no timers)
- `editor/index.tsx`: decides the redirect once per project and skips it on Back/Forward
- `TableEditorMenu.tsx`: schema switch is explicitly `history: 'replace'` (comment only)
- `_app.tsx`, `routes/__root.tsx`, `router.tsx`: wire up the traverse tracking on Next and TanStack
- `EditorBaseLayout.tsx`: the `/editor` index no longer takes its browser title from a still-active tab (it now shows the list in that state)

**Added:**

- Unit tests for the redirect util, the traverse flag, and the editor index decision
- `e2e/studio/features/table-editor-schema-back.spec.ts`

Depends on #51442

## To test

1. Open a table and switch schema. The same table stays open, the dropdown updates, and Back leaves the editor. Forward returns to it.
2. With a last table recorded, open `/project/<ref>/editor` with no id. It opens that table.
3. Open `/project/<ref>/editor?schema=auth` when the last table is in `public`. The list stays and the dropdown says auth. When the last table is in `auth`, it opens.
4. Switch projects. The new project makes its own redirect, and Back doesn't bounce into the previous project's last table.
5. Regression: Back and Forward through the editor don't reopen the last table, and a full-page Back to `/editor` stays on the list.

<!-- CURSOR_AGENT_PR_BODY_END -->

<div><a href="https://cursor.com/agents/bc-a09f1d8c-146b-566b-81f3-0f76f96c5e2e?cursor_ref=pr_footer&cursor_cta=open_in_web"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/assets/images/open-in-web-dark.png"><source media="(prefers-color-scheme: light)" srcset="https://cursor.com/assets/images/open-in-web-light.png"><img alt="Open in Web" width="114" height="28" src="https://cursor.com/assets/images/open-in-web-dark.png"></picture></a>&nbsp;<a href="https://cursor.com/background-agent?bcId=bc-a09f1d8c-146b-566b-81f3-0f76f96c5e2e&cursor_ref=pr_footer&cursor_cta=open_in_cursor"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/assets/images/open-in-cursor-dark.png"><source media="(prefers-color-scheme: light)" srcset="https://cursor.com/assets/images/open-in-cursor-light.png"><img alt="Open in Cursor" width="131" height="28" src="https://cursor.com/assets/images/open-in-cursor-dark.png"></picture></a>&nbsp;</div>

