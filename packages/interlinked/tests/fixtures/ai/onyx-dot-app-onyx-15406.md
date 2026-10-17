## Description

Fourth backend PR of the connector-checks-on-form-state work. Stacked on #15398.

**The flow this PR supports.** The connector form runs the checks while the admin fills it in (on blur, and when they click Create), through the draft runs from #15398. The form calls the create API only when no required check is pending or failed. Otherwise it focuses the checks card. So creation finds fresh draft results and runs nothing. A caller with no draft results, such as an API script or the Terraform provider, still gets the checks run during the request.

**At creation and credential swap** (the `CC_PAIR_VALIDATION` path of `validate_ccpair_for_user`), for a source with named checks (Slack, OneDrive, Outlook):
- **What runs first:**
  - `_validate_credential_binding` runs first, as before.
  - Connector construction still runs: for OneDrive and Outlook it validates the Microsoft hosts. A failure in either step keeps the legacy behavior (a fallback-shaped record, then a raise).
- **The checks:** the source's registered checks run with the pairing's access type and stored config. So permission-sync checks are skipped for PUBLIC and PRIVATE pairs.
- **3-second budget:** creation waits at most `CREATION_BLOCKING_BUDGET_SECONDS` (3 s). Cached draft results count as done at once. The other checks run in parallel threads. A check that is still running at 3 s does not block: creation enqueues `RUN_CAPABILITY_CHECKS` for the unfinished checks (same `run_id` fence, `expires` = the source's run ceiling). That run merges the finished results and stores the full report. If the enqueue fails, the run is marked FAILED_TO_RUN, so the admin can re-run the checks.
- **Reuse:** each check's draft result cache key (#15398's `draft_result_cache_key`) is computed from the stored config. A cached result is reused, and only the other checks run (`generate_capability_report(check_ids=…)`).
- **Storage:** the report goes on the pairing's row with trigger `CC_PAIR_VALIDATION`. The row is claimed with the RUNNING mark, also from a run in flight, and written with the fenced completion upsert. When checks are still running at 3 s, the row stays RUNNING until the background run completes it.
- **What blocks:** only a **required** check that **FAILED** within the 3 s budget. It raises `ConnectorValidationError("Required capability checks failed: <name>: <message>; …")`. With `enforce_creation=False`, it returns `False`. INDETERMINATE (often transient), SKIPPED and not-applicable checks do not block.
- **Unchanged:** sources without named checks keep the legacy path with the same calls. The indexing-attempt and perm-sync-attempt validation paths also do not change.

**New Slack check `slack_channel_patterns`.** Only Slack's `validate_connector_settings` rejected a malformed channel regex, and creation no longer calls it for Slack. So the check is now a required, config-reading named check. `_validate_channel_regexes` is renamed to `validate_channel_regexes` so the check can import it.

**Credential created.** `POST /manage/credential` and `POST /manage/credential/private-key` start a background credential-scoped run (`connector_id=None`, trigger `CREDENTIAL_CREATED`) for a source with named checks. A failed enqueue is logged, and the credential is still created.

**Removed.** The #15374 stopgap (`start_capability_checks_for_new_pairing` and its calls in association and swap). Creation now writes the full report.

**For reviewers**
- **Request time:** a create request waits at most about 3 s for checks, so API and Terraform callers stay within their timeouts. Checks that take longer finish in the background. The next PR holds the pair's first index attempt until required checks pass.
- **Parallel checks:** creation runs checks in parallel, unlike the sequential runner. This can add load on rate-limited sources. A `TODO` in `creation.py` marks a possible concurrency cap.
- **Double probe:** an abandoned check thread can keep probing until its hang guard ends it, while the background run probes the same check.
- **Rate-limit lock:** the named Slack checks use the coordinated client, not the legacy `fast=True` one. So a creation without draft results can wait behind an indexing job that is backing off.

**Follow-ups**
- OAuth flows that create credentials do not start a `CREDENTIAL_CREATED` run yet:
  - `ee/onyx/server/oauth/slack.py`, `confluence_cloud.py`, `google_drive.py`
  - `onyx/server/documents/standard_oauth.py`
  - the Google service-account and app credential creates in `connector.py`
- The creation run does not write its results back into the draft cache.

## Changes from the final review pass

- **A duplicate associate request returns 409 before validation**, so it cannot replace the live pair's capability report or fence out its run.
- A fenced-out creation report write is logged. `send_capability_check_run_task` now lives in `background/celery/tasks/capability_checks/enqueue.py`, below the server layer. The concurrency TODO has an owner.

## How Has This Been Tested?

- New `test_named_checks_at_creation.py` (real Postgres and Redis, fake Slack checks patched into the registry):
  - Every check passes: the full named report is stored, perm-sync is skipped for PUBLIC, and no task is sent.
  - A required check fails: creation raises with its name and message, the failure is stored, and `enforce_creation=False` returns `False`.
  - An INDETERMINATE required check does not block.
  - PRIVATE does not run the perm-sync check; SYNC does.
  - A draft run, then creation with the same config, runs nothing again. With a different config, only the config-reading check runs.
- `test_capability_runs_after_credential_created.py` (replaces the stopgap's test): SLACK sends a `CREDENTIAL_CREATED` task, WEB sends nothing, and a failed enqueue does not fail creation.
- Changed tests:
  - `test_blocking_validation_recorder.py` uses Google Drive, because Slack creation now writes named results.
  - `test_capability_report_endpoints.py::test_scopes_without_rows_return_null` uses a Web credential, because a new Slack credential now writes a RUNNING credential-scope row.
  - The Slack check list includes `slack_channel_patterns`, and a test covers a malformed exclude regex.
- 3-second budget (in `test_named_checks_at_creation.py`): a fast required failure blocks while another check is slow; a slow required check does not block, and the background run stores its real result; a cached draft result counts at once; a failed enqueue marks the run FAILED_TO_RUN.
- Results:
  - External dependency and in-process integration (capability checks, the Confluence binding, `server/documents`, report endpoints, `permissions_resources`): 377 passed.
  - Connector unit tests: 2612 passed.
- `pre-commit` passes.

## Additional Options

- [ ] [Optional] Please cherry-pick this PR to the latest release version.
- [x] [Optional] Override Linear Check

🤖 Generated with [Claude Code](https://claude.com/claude-code)

<!-- This is an auto-generated description by cubic. -->
---
## Summary by cubic
Pairing creation and credential swap now run a source's named capability checks instead of the legacy blocking validation for Slack, OneDrive, and Outlook, and store the full report on the pairing's row.

**Behavior**

- Checks run in parallel for up to 3 seconds with the pairing's access type, so perm-sync checks skip for PUBLIC and PRIVATE pairs; fresh draft-run results are reused.
- Only a required check that FAILED within the budget blocks the pairing; one still running does not, the row stays RUNNING, and a background run of the unfinished checks stores the full report.
- If that background run cannot be enqueued, the run is marked FAILED_TO_RUN so the admin can re-run the checks.
- Slack's channel-regex validation, previously only in `validate_connector_settings`, becomes a required `slack_channel_patterns` check.
- Credential creation (`POST /manage/credential` and `/manage/credential/private-key`) starts a background credential-scoped `CREDENTIAL_CREATED` run for named-check sources; any start failure is logged and creation still succeeds.
- A duplicate associate request returns 409 before validation, so it cannot replace the live pair's report or fence out its run.
- The previous pairing stopgap (`start_capability_checks_for_new_pairing`) is removed.

**Notes**

- A creation without draft results runs the checks inside the request, where Slack lists every workspace channel and can wait behind an indexing job; abandoned check threads can double-probe with the background run.

<sup>Written for commit 0912d70a55c8a917ce8ced14bd5fcd48503fd340. Summary will update on new commits.</sup>

<a href="https://cubic.dev/pr/onyx-dot-app/onyx/pull/15406?utm_source=github" target="_blank" rel="noopener noreferrer" data-no-image-dialog="true"><picture><source media="(prefers-color-scheme: dark)" srcset="https://www.cubic.dev/buttons/review-in-cubic-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://www.cubic.dev/buttons/review-in-cubic-light.svg"><img alt="Review in cubic" src="https://www.cubic.dev/buttons/review-in-cubic-dark.svg"></picture></a>

<!-- End of auto-generated description by cubic. -->

