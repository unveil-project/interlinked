## Problem

- The content autopilot workspace needs state for opportunities before a table can show them.
- Part 10 of 14 in the content autopilot stack, behind the `web-analytics-content-autopilot` flag. Stacked on #109188.

## Changes

- Nothing renders yet. The next layer adds the table.
- The logic loads the saved list first, then refreshes it once, so the page never waits on a refresh.
- It searches, selects up to 5, drafts, and dismisses opportunities.
- It switches to the Drafts tab after drafting starts, and clears the selection.
- The draft button gets a reason when it is disabled: site loading, a run in progress, or nothing selected.
- Polling reloads opportunities while a run is active.
- Stories mock the new endpoints.

## How did you test this code?

New tests, in `contentAutopilotLogic.test.ts`:

- Drafting sends only the selected opportunities for the current site, then clears the selection and switches tabs.
- The saved list loads before a single refresh.

Jest passed on this layer after the rebase onto current master. Kea typegen and the full frontend TypeScript check passed before that rebase, at the top of the stack and on this layer alone. Storybook stories rendered locally.

Not run: the table itself, which lands in the next layer.

👉 _Stay up-to-date with [PostHog coding conventions](https://posthog.com/docs/contribute/coding-conventions) for a smoother review._

## Release status

- [ ] No feature flag controls this change <!-- release-status: no-feature-flag -->
- [x] This change is behind a feature flag and is not available to users <!-- release-status: behind-feature-flag -->
- [ ] This change makes a previously flagged feature available to everyone <!-- release-status: fully-available -->

## Automatic notifications

- [ ] Publish to changelog?

## Docs update

None. The feature is behind a flag.

## 🤖 Agent context

**Autonomy:** Human-driven (agent-assisted)

**Agent:** Claude Code, Claude Opus 5.5

- Skills invoked: /simplify, /writing-pr-descriptions, /reviewing-with-coderabbit, /writing-tests, /writing-user-facing-copy.
- A /simplify pass changed no behavior.
- CodeRabbit CLI (`cr review --base jordanm-posthog/aeo-cg-09-drafting-api`): no findings.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
