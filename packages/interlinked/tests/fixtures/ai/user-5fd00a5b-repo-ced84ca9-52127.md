<!-- CURSOR_AGENT_PR_BODY_BEGIN -->
Opening a URL-driven panel pushes a history entry. Close goes back only when this session still owns that entry and the rest of the URL is unchanged. A panel back records its destination URL, and the page-level unsaved-changes guard skips its confirm only for that URL. Scripted `navigation.back` isn't treated as a user back. Forward that restores an id this session just deleted clears it with no toast, and any other missing id is still the normal not-found case.

**Changed:**
- Panel open still pushes. Close, Cancel, and a successful save go back when this session owns the entry. A clear that doesn't own the entry replaces, and a second clear of an already-clear key does nothing.
- A new value while the same panel is already open replaces, even when the caller passes push. Search and other non-panel query updates stay replace.
- A missing delete id is always replaced. The id from the successful delete is cleared with no toast. Any other missing id is replaced and shows the existing not-found toast, even while that mutation is still successful. Roles, vault secrets, OAuth apps, functions, triggers, indexes, wrappers, vector tables, cron jobs, enumerated types, webhooks, and edge function secrets share that helper.
- Next `routeChangeStart` and TanStack traversals (`BACK`, `FORWARD`, `GO`) skip the unsaved-changes confirm only when the destination is the URL recorded for that panel back. Push and replace still confirm.
- Scripted `navigation.back` is `userInitiated: false`. Aborted `committed` and `finished` promises are caught.
- The restore `popstate` listener only exists while a canceled dirty back is being put back, and it's removed when that restore finishes, times out, or a real traverse cancels it. If the restore never lands, the swallowed popstate is dispatched again so the address bar and the panel state match.
- The Next router binding is removed when the guard unmounts, so a later navigation can clear the pending destination.
- Creating a queue uses `router.replace` onto the queue page, so it replaces the `?new=true` entry and history is the list, then the queue. The queue name is encoded in the path.
- `useAddonsPagePanel` uses `usePanelQueryState` with `parseAsStringLiteral`. The add-on `commitPanel` helper is gone and those side panels call `closePanel`. Webhook save uses `handleCommit`, and the webhook form still resets from the effect that runs when the panel opens.

**Added:**
- A dirty page doesn't confirm again when a panel back starts a Next route change to the recorded URL, and a different route still declines. A TanStack push is still blocked while a panel destination is pending.
- Roles delete: `history.forward()` restores `delete=<id>`, then the stale-id replace clears it. After that delete, a different missing id is cleared and toasts "Role cannot be found".
- Webhooks: `history.forward()` restores `delete=<id>`, then the stale-id replace clears it with no "Webhook not found" toast.
- Queue create: success replaces the create-sheet entry, and the path encodes the queue name.

## To test

1. Database → Roles, Add role. The URL gains `?new=true`. Back closes the panel and stays on the page, and Forward reopens it. Repeat on Next and TanStack.
2. On a dirty page, closing the panel doesn't raise the page-level unsaved-changes dialog. A link to another page, or a browser Back that leaves the page, still does.
3. Delete a vault secret, a custom role, an enumerated type, a webhook, or an edge function secret, then Forward. The delete dialog doesn't stay on the deleted id, and there's no not-found toast for that id.
4. After that delete, open `?delete=` for a different id that isn't in the list. The param is cleared and the not-found toast shows.
5. Create a queue. The queue page opens in place of `?new=true`, and Back returns to the queue list without reopening the create sheet.
6. On a dirty webhook, Back still asks to discard.
7. Type in a list search. The URL updates in place, and Back doesn't undo each keystroke.

<!-- CURSOR_AGENT_PR_BODY_END -->

<div><a href="https://cursor.com/agents/bc-96c47a99-bfa1-5e17-aeca-37c280e298f6?cursor_ref=pr_footer&cursor_cta=open_in_web"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/assets/images/open-in-web-dark.png"><source media="(prefers-color-scheme: light)" srcset="https://cursor.com/assets/images/open-in-web-light.png"><img alt="Open in Web" width="114" height="28" src="https://cursor.com/assets/images/open-in-web-dark.png"></picture></a>&nbsp;<a href="https://cursor.com/background-agent?bcId=bc-96c47a99-bfa1-5e17-aeca-37c280e298f6&cursor_ref=pr_footer&cursor_cta=open_in_cursor"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/assets/images/open-in-cursor-dark.png"><source media="(prefers-color-scheme: light)" srcset="https://cursor.com/assets/images/open-in-cursor-light.png"><img alt="Open in Cursor" width="131" height="28" src="https://cursor.com/assets/images/open-in-cursor-dark.png"></picture></a>&nbsp;</div>

