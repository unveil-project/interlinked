## Problem

Users triaging failing MCP tools from the dashboard have no direct path to a tool's report. They open Tool quality, sort by error rate, and click "Full report".

## Changes

- Clicking a bar on "Tools with the highest error rate" opens that tool's report.
- The report opens on the dashboard's date range, not its own 30-day default, so the numbers match the clicked bar.
- The shared property filters and the internal-users toggle carry over.
- Nothing looks different at rest. The bars show a pointer cursor on hover.

## How did you test this code?

- Ran `mcpDashboardOverviewLogic.test.ts` locally.
- Not checked: the click in a running app.

**Test rationale:** the new logic test catches a link that drops the dashboard's date range or the shared filters. No existing test covers navigation from the dashboard.

## Release status

- [x] No feature flag controls this change <!-- release-status: no-feature-flag -->
- [ ] This change is behind a feature flag and is not available to users <!-- release-status: behind-feature-flag -->
- [ ] This change makes a previously flagged feature available to everyone <!-- release-status: fully-available -->

## Automatic notifications

- [ ] Publish to changelog?

## Docs update

None.

## 🤖 Agent context

**Autonomy:** Human-driven (agent-assisted)

**Agent:** Claude Code, Opus 5.5 (`claude-opus-5-5[1m]`)

- Skills: `/working-with-charts`, `/writing-ui-components`, `/writing-pr-descriptions`, `/reviewing-with-coderabbit`.
- CodeRabbit CLI ran without `--deep` (small UI diff) and reported 0 findings.
- Scoped to the error rate card. "Tool call breakdown" is a follow-up candidate.
- Duplicate search found no open PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
