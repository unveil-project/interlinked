## Problem

GitLab warehouse users cannot analyze releases, comments, or issue and merge request cycle time.
The source syncs current issue and MR state, but no deployments, no comments, and no open/close history.
These gaps come from the GitLab section of `COVERAGE_GAPS_APPENDIX.md`.

**Why:** close the long-standing GitLab coverage gaps the endpoint audit recorded.

## Changes

- Users can now select five new GitLab tables:

| Table | Endpoint | Sync |
| --- | --- | --- |
| `deployments` | `/projects/:id/deployments` | Incremental on `updated_at` |
| `issue_notes` | `/projects/:id/issues/:iid/notes` | Incremental on `created_at`, merge only |
| `merge_request_notes` | `/projects/:id/merge_requests/:iid/notes` | Incremental on `created_at`, merge only |
| `issue_state_events` | `/projects/:id/issues/:iid/resource_state_events` | Incremental on `created_at`, merge only |
| `merge_request_state_events` | `/projects/:id/merge_requests/:iid/resource_state_events` | Incremental on `created_at`, merge only |

- `deployments` pairs `updated_after` with `order_by=updated_at`, because GitLab rejects the filter with any other sort.
- The four child tables fan out over `issues` or `merge_requests`, one request per parent.
- The child endpoints have no time filter. An incremental sync instead lists parents with `updated_after` set to the child watermark.
- That bound holds because a new note or state event bumps the parent's `updated_at`.
- Each child row carries `issue_iid` or `merge_request_iid`, which is part of its primary key.
- Child tables declare `sort_mode="desc"`, so the watermark only advances when the run finishes. Rows arrive grouped by parent, not by time.
- Append mode is off for child tables, because a re-fanned parent re-emits children that already synced.
- A child 404 (parent deleted mid-sync) is skipped instead of failing the run with the non-retryable "project not found" error.
- Child pages come newest-first. A per-parent cap of 100 pages therefore drops only the oldest tail, with a warning log.
- Resume checkpoints the parent page URL.
- Sparse fan-outs flush a partial chunk every 60 seconds, so later empty parents reach `safe_point()`.
- Cross-reference system notes do not bump the parent. An incremental sync sees them only after the parent next updates, and a full refresh collects them.
- Mechanical: the page loop moved into a shared `iter_pages` helper. The GitLab dataclasses declare `frozen=True`, and their dataclass ratchet baseline lines are gone. Canonical column descriptions and ticked appendix lines round it out.

Skipped: `/projects/:id/dora/metrics`.
It is Ultimate-tier only, and returns pre-aggregated daily values over a default 3-month window that GitLab recomputes.
That gives no stable history to sync, and deployment frequency is derivable from the new `deployments` table.

## How did you test this code?

All four endpoints were checked against the GitLab REST docs source (`doc/api/{deployments,notes,resource_state_events,dora/metrics}.md`). Not run: any request against a live GitLab instance.

Ran `hogli test products/warehouse_sources/backend/temporal/data_imports/sources/gitlab/`, the source catalog invariant tests, and mypy on the touched GitLab modules.

**Test rationale:**

- A new fan-out case in `TestGetRows` covers three regressions. It fails if the parent walk loses its `updated_after` bound, if child rows lose the parent iid, or if a deleted parent's 404 fails the run.
- A page cap case fails if child pagination stops honoring `MAX_PAGES_PER_PARENT`.
- `TestBuildInitialParams` gains a `deployments` case for the GitLab filter-and-sort pairing.
- A sparse fan-out case fails if a buffered row stops later empty parents from reaching `safe_point()`.
- `test_response_shape` and `test_schema_incremental_support` gain child rows. They catch a missing parent column in the composite key, or append mode being offered for child tables.

## Release status

- [x] No feature flag controls this change <!-- release-status: no-feature-flag -->
- [ ] This change is behind a feature flag and is not available to users <!-- release-status: behind-feature-flag -->
- [ ] This change makes a previously flagged feature available to everyone <!-- release-status: fully-available -->

## Automatic notifications

- [ ] Publish to changelog?

## Docs update

None in this repo. The public GitLab source doc renders its table list from `get_schemas`, so the new tables appear there with no doc edit.

## 🤖 Agent context

**Autonomy:** Fully autonomous

**Agent:** Claude Code, Opus 5.5 (`claude-opus-5-5`)

- Skills invoked: `/implementing-warehouse-sources`, `/writing-tests`, `/writing-pr-descriptions`.
- No duplicate: open PR searches for GitLab, deployments, DORA, notes, resource state events and the module path found nothing that covers these tables.
- Public artifact: all fixtures are invented. The session drew on no customer material.

---
*Created with [PostHog Desktop](https://posthog.com/desktop?ref=pr)*

🤖 Generated with [Claude Code](https://claude.com/claude-code)

