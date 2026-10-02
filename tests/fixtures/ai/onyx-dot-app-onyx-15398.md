## Description

Third backend PR of the connector-checks-on-form-state work. Stacked on #15394.

A connector form can now run the capability checks against what the admin has filled in so far, before the connector exists. Draft runs never write `credential_capability_report` rows. The existing `POST /admin/credential/{id}/capability-check` keeps serving saved connectors and stored reports, unchanged.

**API**

`POST /manage/admin/connector-checks/runs`
- Body (strict): `{source, credential_id, access_type?, draft_key, form_state}`. `draft_key` identifies one form session, 1–128 characters of `[A-Za-z0-9_-]`.
- Authorization, as for the existing trigger: `MANAGE_CONNECTORS` (scoped allowed), the credential is visible to the caller, and the source can use the credential (family credentials).
- No call to the source happens in the request. It validates the form state, decides each registered check's state, fills states from the result cache, and enqueues one task for the checks still pending.
- Errors:
  - 400 for a source with no config class, or a credential the source cannot use.
  - 404 for an unknown or invisible credential.
  - 503 when the enqueue fails. The run is then stored as `failed_to_run`.

`GET /manage/admin/connector-checks/runs/{run_id}`
- Returns the snapshot for the client to poll. It gives 404 for an expired run or another user's run.

Snapshot shape:
- `{run_id, draft_key, source, credential_id, access_type, status, form_errors, unknown_fields, checks}`
- `status`: `running | completed | superseded | failed_to_run`.
- Each check: `{check_id, display_name, capability, required, state, message, missing_fields, invalid_fields, remediation, docs_link, duration_ms, from_cache}`.
- `state`: `pending | running | passed | failed | indeterminate | skipped | waiting | not_applicable`.
  - `waiting`: a required field is missing or invalid, or a config-reading check has no config yet. The field names are in `missing_fields` / `invalid_fields`. While the admin types, an invalid field means "waiting", not "failed".
  - `not_applicable`: the access type, or the check's `applies()`, excludes it.
  - The fallback check, which needs a connector instance, is pending only when the form is complete.

**One readiness decision** (`runner.py`)
- `decide_check_readiness(check, context)` returns a typed kind: `not_applicable`, `missing_fields`, `invalid_fields`, `needs_config`, `needs_instance` or `runnable`, with the field names.
- The stored-report runner maps it back to today's outcomes and messages exactly; existing tests pass with no edits. Draft runs map it to the states above.
- `run_capability_checks` takes an optional `on_result` progress callback. The callback code is the same as #15007's, so the two PRs merge cleanly.
- `generate_capability_report` takes a `check_ids` filter. A filtered run builds the connector only when a selected check needs it.

**Storage, task, cache and superseding** (`capability_checks/draft_runs.py`)
- **Storage:** a run is JSON in the tenant's cache backend (Redis or the Postgres cache), with a 30-minute TTL.
- **Task:** `RUN_DRAFT_CAPABILITY_CHECKS` (high priority, expires after 5 minutes) runs the pending checks. It goes to its own queue, `capability_checks_draft`, which the light worker consumes. The form waits on draft runs, so they must not wait behind the perm and group syncs on the heavy worker's `capability_checks` queue. Stored runs stay there. It writes each result as it lands, then marks the run completed.
- **Lease:** a `running` run has a lease: the queue expiry at start, then each check's hang guard. A GET after the lease ends reads `failed_to_run`, so a dropped or killed task does not stay `running`.
- **Result cache:** results are kept for 10 minutes, keyed by credential (and its `time_updated`), source, check, access type and config hash.
  - The config hash covers the validated form values for checks that read the config or need a connector instance. Other checks, such as token and listing checks, hash only the config keys the source's gateway declares in `config_keys` (for example a site URL). Edits to other fields reuse their results; a host edit runs them again.
  - Indeterminate results are not cached, because they are often transient.
- **Superseding:** a newer POST for the same `(user, draft_key)` moves a latest-run pointer. Concurrent starts are serialized by a lock per user and draft key, so the run saved last is the latest. Each save renews the pointer. The older run's task stops before its next check and stores `superseded`. Its GET reads `superseded` at once.
- **Access:** the GET checks again that the caller can see the run's credential.

**Known limits**
- A run whose task never starts reads `running` until its TTL ends. There is no stale sweep for draft runs yet.
- Unknown form keys go to `unknown_fields` and do not cause a 400.
- Later PRs: the saved-connector scope on this endpoint, and running the named checks at creation from a fresh draft result.

## How Has This Been Tested?

- Unit (`test_draft_check_states.py`):
  - Draft states: waiting for missing and invalid fields, waiting with no config, not applicable by access type and by `applies()`, and the fallback check needing a complete form.
  - Cache keys: they ignore form edits for config-independent checks and change for config-reading ones.
- External dependency (`test_draft_check_runs.py`, real Postgres and Redis, fake checks patched into the registry, the task run in-process):
  - The immediate states, then the results, then GET reads completed.
  - A second POST that adds `channels` reuses the cached token result (`from_cache`) and runs only the channels check.
  - A supersede during a run: the first run reads superseded, and its task stops after the current check.
  - Another user gets 404 on GET.
  - A Web credential on a Slack run gets 400.
- Existing capability check unit, external dependency and report endpoint tests pass with no edits.
- `pre-commit` passes.

## Additional Options

- [ ] [Optional] Please cherry-pick this PR to the latest release version.
- [ ] [Optional] Override Linear Check

🤖 Generated with [Claude Code](https://claude.com/claude-code)

<!-- This is an auto-generated description by cubic. -->
---
## Summary by cubic
A connector form can now run capability checks against what the admin has filled in so far, before the connector exists. Draft runs never write `credential_capability_report` rows; the existing endpoint for saved connectors is unchanged.

- `POST /manage/admin/connector-checks/runs` validates the form, resolves each check's state immediately (`waiting`, `not_applicable`, or `pending`), and enqueues one task for pending checks. It makes no calls to the source.
- Pending checks enqueue on `capability_checks_draft`, a queue the light worker consumes, so the form is not stuck behind the long perm and group syncs on the heavy worker's `capability_checks` queue.
- `GET /manage/admin/connector-checks/runs/{run_id}` returns the run snapshot for polling; only the user who started it can read it, and only while they can still see the credential.
- A newer POST for the same `draft_key` supersedes the older run, and its task stops before its next check. Concurrent starts are serialized so the run saved last is the latest.
- The run request takes `rerun_failed`; cached failed results run again instead of being reused, so a fix made at the source since the last run shows at Connect.
- Runs and results live in the cache backend with short TTLs. Cached results key on the form values only for checks that read the config and on the gateway's `config_keys` for others, so edits re-run just those; indeterminate results are never cached.
- A `running` run read after its lease expired reads as `failed_to_run`, so a dropped or killed task does not stay `running`.

**Refactors**

- The runner now decides readiness in one place (`decide_check_readiness`); the stored-report path maps it to the same outcomes as before.
- `run_capability_checks` takes an `on_result` progress callback, and `generate_capability_report` takes `on_result` and a `check_ids` filter.

<sup>Written for commit 89eb67bc35f26ee062fd4271046fe6b32598f514. Summary will update on new commits.</sup>

<a href="https://cubic.dev/pr/onyx-dot-app/onyx/pull/15398?utm_source=github" target="_blank" rel="noopener noreferrer" data-no-image-dialog="true"><picture><source media="(prefers-color-scheme: dark)" srcset="https://www.cubic.dev/buttons/review-in-cubic-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://www.cubic.dev/buttons/review-in-cubic-light.svg"><img alt="Review in cubic" src="https://www.cubic.dev/buttons/review-in-cubic-dark.svg"></picture></a>

<!-- End of auto-generated description by cubic. -->

