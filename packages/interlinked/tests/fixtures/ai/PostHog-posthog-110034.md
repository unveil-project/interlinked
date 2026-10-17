## Problem

- Notebook PRs go to the wrong team for review. Notebooks now belong to team-data-modeling, but the ownership files still name team-data-tools.
- Notebook changes in the MCP service get no team at all. Those paths fall back to `team-context-mcp`, which does not exist in the GitHub org, so the assigner drops it ([example run](https://github.com/PostHog/posthog/actions/runs/36858647835)).

## Changes

- The reviewer assigner now requests team-data-modeling for these notebook paths:
  - the notebooks product (`products/notebooks/product.yaml`)
  - the notebooks scene (`frontend/src/scenes/notebooks/`)
  - the `MarkdownNotebook` component
  - the MCP notebook tools, the `notebook-*.md` instruction templates, and the notebook MCP tests (new rules)
- `HogQLEditor` and `RichContentEditor` stay with team-data-tools.
- Nothing user-visible changes. The change affects only review routing and ownership lookups.

## How did you test this code?

- The owners resolver (`python -m owners_yaml`) resolved sample paths to the expected team: notebook paths go to team-data-modeling, and the two editors go to team-data-tools.
- `hogli owners:lint` passed. Its warnings all come from files this PR does not touch.

**Test rationale:** No new test. The change is ownership data, and `hogli owners:lint` already validates it.

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

**Agent:** Claude Code, Claude Opus 5.5 (`claude-opus-5-5[1m]`)

- The work started from a question about why a notebooks MCP PR got no team reviewer. The assigner log showed that `team-context-mcp` was dropped with a 422 error.
- The person directing the work chose to move only `MarkdownNotebook` among the shared components.
- The rest of `services/mcp/` still points at `team-context-mcp`. This PR leaves that unchanged, because it is not notebook ownership.
- Skills invoked: `/reviewing-with-coderabbit`, `/writing-pr-descriptions`.
- CodeRabbit CLI pass: skipped. The CLI was signed out, and the person chose to skip setup for this small change.
- Duplicate check: an open-PR search found no other PR that changes notebook ownership.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
