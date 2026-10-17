## Problem

The organization billing API has no per-project routes. A service that watches one project's usage or spend must hold a credential for the whole organization's billing. The billing API RFC lists five project routes, and leaves them to a later phase that would add a per-project usage table in billing.

## Changes

- New routes under `/api/projects/{id}/billing/`. `usage/` gives usage this billing period, per counter. The others are `usage/timeseries/`, `spend/timeseries/`, `usage/export/` and `spend/export/`.
- Each route is the organization read pinned to the project's teams. Billing serves no new query, and the change needs no new data. A `team_ids` parameter cannot widen the read.
- A credential reaches a project when it covers it. An organization-wide session, personal key or OAuth token covers every project, so MCP callers need no new credential. A project-scoped key covers its projects.
- A project secret key may hold `billing:read`, which reaches its own project's routes. Only someone with full billing access can grant it or roll such a key.
- A project secret key's exports count against the key, not against the synthetic user every key shares.
- `BillingReadViewSet` now holds the grants, scoping, series and export helpers that the organization and project viewsets share. This part is mechanical.
- The schema postprocessing treats an organization path as a deprecated duplicate when a project path has the same suffix. It then renames the operation with `org_`. The organization billing viewset opts out with `org_routes_differ_from_project_routes`, so its operations keep their names. The generated client and MCP changes are additive, and the five new MCP tools are off.
- A project with no billing period yet gets `usage/` for the current calendar month in UTC, with `billing_period: null`.

## How did you test this code?

- `ee/api/test/test_organization_billing.py`, `TestProjectBillingAPI`: a credential matrix on a project route. It covers a session, an organization-wide OAuth token, and keys scoped to this and another project, personal and secret. Each request names another project in `team_ids`. With the pin removed, the whole-organization cases fail, so the test guards the read that would leak.
- The same class: `usage/` sums the series from the start of the billing period.
- `posthog/api/test/test_project_secret_api_keys.py`: granting `billing:read`, and rolling a key that holds it, need full billing access. Without `ee`, the check refuses the grant. Each refused case fails with its check removed.
- `ee/api/test/test_billing.py`: two project secret keys each get their own export slot.
- `TestProjectBillingAPI`: a timeout on either billing read of `usage/` answers `usage_query_timeout`.
- The existing organization billing tests pass unchanged after the refactor.
- Ran locally: mypy over the repository, the security semgrep rules on the changed files, and `hogli build:openapi`.
- Not covered by a test of its own: the export routes. They share the pinning code with the series.

**Test rationale:** No existing test covers project-scoped billing reads or the `billing:read` grant rule. The credential matrix guards against a project route reading the whole organization.

## Release status

- [ ] No feature flag controls this change <!-- release-status: no-feature-flag -->
- [x] This change is behind a feature flag and is not available to users <!-- release-status: behind-feature-flag -->
- [ ] This change makes a previously flagged feature available to everyone <!-- release-status: fully-available -->

The routes answer 403 unless `organization-billing-api` is on for the organization.

## Automatic notifications

- [ ] Publish to changelog?

## Docs update

None.

## 🤖 Agent context

**Autonomy:** Human-driven (agent-assisted)

Skills used: `improving-drf-endpoints`, `writing-tests`, `reviewing-with-coderabbit`.

CodeRabbit CLI ran on the branch with `--deep`. One finding:
- Fixed: `posthog/api/project_secret_api_key.py` imported `ee.billing.grants` at module level. The grant check now imports it only when someone grants `billing:read`, and refuses that scope without `ee`.

Review bots on this PR:
- Fixed: rolling a `billing:read` key skipped the billing grant check, so an admin under owner-only billing could get a working secret.
- Fixed: project secret key exports shared one export slot budget across organizations, through the synthetic user's primary key.
- Fixed: a timeout reading the billing period on `usage/` became a 500.
- Rejected: move the optional `ee` import to module level. The function-level import with a justified `noqa: PLC0415` follows AGENTS.md for optional dependencies, and the suggested form needs `type: ignore` lines.
