## Summary
`openclaw status` reports a misleading warning for Mattermost:

`Mattermost | ON | WARN | partial tokens (need bot+app)`

Mattermost accounts only require `botToken` (+ `baseUrl`), not `appToken`.

## Reproduction
1. Configure Mattermost accounts with valid `botToken` + `baseUrl`.
2. Run `openclaw status`.
3. Observe warning: `partial tokens (need bot+app)`.

## Expected
Mattermost should be considered configured with bot token only (no app token requirement).

## Actual
Status token summary logic treats any channel with `botToken` as if `appToken` is also required.

## Root cause
In `src/commands/status-all/channels.ts`, `summarizeTokenConfig` enters the bot+app path when account records contain either `botToken` or `appToken`, then enforces both.

This is valid for Slack, but not for Mattermost.

## Proposed fix
Make token summary mode-aware by field presence:
- if both `botToken` and `appToken` fields exist -> require bot+app
- if only `botToken` exists -> require bot only
- if `token` exists -> require token

I have a patch ready with a regression test and can open a PR immediately.
