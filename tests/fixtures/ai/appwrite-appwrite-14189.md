<!-- CURSOR_AGENT_PR_BODY_BEGIN -->
## What does this PR do?

Adds the 65 `emails.*` keys that `de.json` was missing compared with `en.json`, so German locale mail (including MFA challenge codes) no longer falls back to English.

Fixes #14134.

New strings keep every placeholder and `{{b}}` / `{{/b}}` tag from the English source. Keys that complete an existing German template use that template's address form (`du` for verification, recovery, and invitation; `Sie` for magic URL and OTP session). New templates follow the `Sie` form already used by the German magic-URL and OTP session mail.

Existing German strings are unchanged, including the `du` / `Sie` mix noted in the issue.

## Test Plan

- Parsed `de.json` and compared its key set with `en.json`: both have 313 keys, and every `emails.*` placeholder list on a newly added key matches English.
- Diff is 65 insertions in `app/config/locale/translations/de.json` only.

## Related PRs and Issues

- Fixes #14134
- Same gap as #12448, filled for French in #12449

## Checklist

- [x] Have you read the [Contributing Guidelines on issues](https://github.com/appwrite/appwrite/blob/master/CONTRIBUTING.md)?
- [ ] If the PR includes a change to an API's metadata (desc, label, params, etc.), does it also include updated API specs and example docs?

<!-- CURSOR_AGENT_PR_BODY_END -->

<div><a href="https://cursor.com/agents/bc-bc20e6bc-7ae3-54d3-8d93-828e889b3637?cursor_ref=pr_footer&cursor_cta=open_in_web"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/assets/images/open-in-web-dark.png"><source media="(prefers-color-scheme: light)" srcset="https://cursor.com/assets/images/open-in-web-light.png"><img alt="Open in Web" width="114" height="28" src="https://cursor.com/assets/images/open-in-web-dark.png"></picture></a>&nbsp;<a href="https://cursor.com/background-agent?bcId=bc-bc20e6bc-7ae3-54d3-8d93-828e889b3637&cursor_ref=pr_footer&cursor_cta=open_in_cursor"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/assets/images/open-in-cursor-dark.png"><source media="(prefers-color-scheme: light)" srcset="https://cursor.com/assets/images/open-in-cursor-light.png"><img alt="Open in Cursor" width="131" height="28" src="https://cursor.com/assets/images/open-in-cursor-dark.png"></picture></a>&nbsp;</div>

