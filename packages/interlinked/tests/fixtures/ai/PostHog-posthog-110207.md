## Problem

Every person delete in dev, prod-us and prod-eu runs the tombstone order, so the legacy order behind `PERSON_DELETE_TOMBSTONE` is dead code that a reader still has to understand.

- The legacy order published ClickHouse tombstones at version + 100, then hard-deleted the Postgres rows.
- The tombstone order keeps the Postgres rows, publishes ClickHouse tombstones at the exact versions the replica wrote, and lets the weekly sweep and daily drain clean up.
- The setting has been on in every environment since 2026-09-24 and no delete has used the legacy order since.

## Changes

Nothing user-visible changes for a cloud user. A deleted person behaves the same as it did yesterday.

- Person deletes always run the tombstone order. The `PERSON_DELETE_TOMBSTONE` setting is gone.
- The `delete_postgres` and `tombstone_clickhouse` steps no longer exist, so a `deletion_errors` entry in the API can only name `tombstone_postgres`, `publish_clickhouse_tombstone`, or the steps before them.
- The `posthog_person_delete_tombstone_enabled` gauge and `posthog_person_deletion_mode_persons_total` counter are gone. Both only existed to watch the cutover.
- The fake personhog client hides tombstoned persons and mappings on reads, as the replica does. Tests that inspect a tombstone use the new `stored_person` accessors.
- Mechanical: `delete_person`, `delete_persons_from_postgres` and their two helpers are removed from `posthog/models/person/util.py`, and the Dagster op reports a failed Postgres tombstone instead of a failed delete.

> [!NOTE]
> Self-hosted installs are affected: their Django now tombstones too, while the ingestion default still runs the legacy create path. A follow-up PR flips the Node `PERSON_MERGE_TOMBSTONE_TEAM_ALLOWLIST` default to every team and should land first.

## How did you test this code?

**Test rationale:** no new coverage. The legacy cases in `test_bulk_delete_helpers.py`, `test_person.py`, `test_person_personhog.py` and `test_data_deletion_requests.py` were deleted or converted to the tombstone order, and the tombstone tests already in those files cover the surviving path. The fake-client and drain tests switched from read RPCs to the stored-row accessors so they keep inspecting tombstones.

Run locally against a Postgres and ClickHouse: models/person, personhog_client, the person API tests, Temporal delete-persons, the Dagster drain, tombstone queue and data deletion request suites, and the ai_training deletion test.

Not checked: two data deletion request tests that fail locally on a stale ClickHouse JSON events schema, unrelated to this diff.

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

**Agent:** Claude Code, Fable 5.1

- Skills invoked: /writing-tests, /writing-code-comments, /writing-pr-descriptions, /reviewing-with-coderabbit.
- CodeRabbit CLI ran with `--deep` on the final commit: no findings.
- The first test run showed the fake personhog client returning tombstoned persons from reads, which the replica never does. The fake was changed to match the replica rather than relaxing the API assertions.
- Follow-ups outside this repo: the person deletion Grafana dashboard reads the two removed metrics, and the charts runbooks still describe the removed steps.
