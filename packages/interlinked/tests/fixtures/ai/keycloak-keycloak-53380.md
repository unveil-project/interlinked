Closes #53372

The remove button on each row of the group, role and organization selects in the fine-grained admin permissions screens was icon-only, so it had no accessible name and screen readers announced an unlabelled button.

Each button now has an `aria-label` that names the row it removes, for example "Remove organization acme", using three new message keys: `removeGroup`, `removeRole` and `removeOrganization`.

Prettier, ESLint, the TypeScript check and the admin UI build pass. I have not exercised it in a running server.

AI usage: an AI agent was used to write this change; I have reviewed it.