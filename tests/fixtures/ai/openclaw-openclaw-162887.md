## What Problem This Solves

Fixes update reports that lead with runtime failure codes and can make saved recovery/version observations look current.

## User Impact

Runtime-check failures now start with a plain explanation and the already-selected next step, followed by operator details. Recorded recovery and verification are explicitly historical; a current Gateway response remains only a response/version observation.

## Why This Change Was Made

The shared report renderer supplies CLI output, update notices, and Control UI summaries. The two runtime refusal codes also cover unreadable runtimes and failed capability checks, so the report must not assume Node is outdated or prescribe an upgrade.

This changes presentation only. Reason codes, status, phases, failure facts, disclosure/redaction, action selection, recovery constraints, and structured CLI/API results are unchanged. No automatic retry or chat-availability promise is added.

Release-note text: Update failure reports now put runtime-check explanations and the selected next step ahead of diagnostics, and clearly label recorded recovery and verification separately from current Gateway observations.

The frozen contribution rules reserve generated changelogs for release workflows; release-note context is recorded here.

## Evidence

Exact head: `cd6ba7218fefea51581714b3acb12ccbcf7f5314` (unchanged for presentation proof).

- Required [CI 36931436156](https://github.com/openclaw/openclaw/actions/runs/36931436156) and [Security Review 36933166461](https://github.com/openclaw/openclaw/actions/runs/36933166461) passed. Both real-gateway UI shards passed; job wall times were 346 and 258 seconds including setup and other tests.
- Native focused validation retained: **163 tests in four files** at integration head `64cb54ba4b0ddc882c3cf55715cf515db4afdd8c`, across two shards in 65.70 seconds (infra: 137 cases, 38.23s; CLI: 26 cases, 6.29s). Presentation files and dependency inputs are unchanged at the current head. Files: `src/infra/update-run-report.test.ts`, `src/infra/update-run-diagnostics.test.ts`, `src/cli/update-cli/status.test.ts`, `src/cli/update-cli/progress.test.ts`. Targeted formatting, normal commit hooks and diff-check passed.
- The current head includes one independently reviewed CI fixture correction: poll the existing `aria-disabled=false` assertion after the effort control becomes visible during hydration. No expected value, deadline, click/slider coverage, or UI production behavior changed. The [prior failure](https://github.com/openclaw/openclaw/actions/runs/36930222904/job/110597722292) remains a failed run; the correction adds no test cases.
- Regression coverage includes Node version/capability/inspection refusals, selected and historical actions, OCM ownership, UTF-16-safe bounds, conflicting recorded/current versions, unavailable current health and unchanged records/CLI JSON.
- Independent source and integration review found no code defects. The [exact-head review](https://github.com/openclaw/openclaw/pull/162887#issuecomment-5937062959) confirmed the completed presentation evidence and found no actionable introduced defect.

### Actual Control UI before / after

A temporary isolated fixture on the qualified native checkout used `createControlUiE2eSuite`, `installMockGateway` and `createUpdateRunFixture`. Both images render the real Control UI with the same synthetic terminal Node-preflight failure. The before page loads the byte-exact formatter from `6f56df6b5a80411ba75fb2e158dc4b7565698f1c`; the after page loads this PR head. All other UI source remains at this PR head. No updater runs: both cases assert zero `update.run` requests.

Native scoped command: `pnpm test:ui:e2e ui/src/e2e/update-run.failure-message-proof.e2e.test.ts`. **Two cases passed in 15.82 seconds** (fixture 4.338s). The first attempt exposed an incomplete synthetic recovery input; adding its required recorded recovery-verification step corrected the fixture. No tracked source or head changed. These captures are synthetic browser proof, not a live Gateway, update, or Telegram observation.

The inspected, sanitized images were attached in the originating chat and uploaded here. All four PR image elements were decoded at 1440×1100 and their rendered before/after pairs inspected in headless Chromium; the PR rendering destination is verified. No desktop interaction was used.

Before — the code and saved-version claim lead the report:

![Control UI before: Node preflight failure](https://github.com/user-attachments/assets/152cc8d7-1b19-40b9-9c53-6fa07bb8dca8)

After — plain failure explanation and the existing selected action precede details:

![Control UI after: plain failure explanation before diagnostics](https://github.com/user-attachments/assets/4ba84d1b-a1e9-43c8-9825-069a3d800147)

Supplemental detail captures use the same real report scrollbar to expose the recorded-recovery/version labels. Independent read-only review found the captures privacy-safe and confirmed the actual UI/formatter path. The expanded two-case fixture passed in 13.70 seconds; no additional product tests or source changes were added.

![Control UI before details: historical recovery wording](https://github.com/user-attachments/assets/cfb26f47-148f-48ad-a37f-091cd57ab1fc)

![Control UI after details: explicitly recorded recovery and verification](https://github.com/user-attachments/assets/b183c5d6-03cb-4497-9899-8642af01183e)

### Isolated Telegram Test Server proof

**Passed at the exact source head above.** One native scoped scenario delivered synthetic terminal Node-preflight ledger input through `createUpdateRunNotifier(initial)` with production defaults, current command-owner authorization, normal channel delivery and durable notice ownership. The leased QA user is the sole owner in the disposable SUT config; its identity, token, Test API route, config and state were bound to that fixture. No real updater or live personal bot ran, and no current-health port was supplied.

Sanitized native command: `node .agents/skills/telegram-e2e-userbot/scripts/run-mock-sut-user-e2e.mjs --source-gateway --backend mock --dm --gateway-port 61834 --mock-port 61835 --scenario <proof>/telegram-scenario.json --timeout-ms 180000 --record <proof>/events.ndjson --output <proof>/summary.json`. Both explicit ports were verified free before the run.

- Runner **exit 0 in 230.94s**; scenario command **exit 0 in 26.990s**, without timeout; tracked work drained successfully.
- Test Bot API: exactly one `sendMessage`, HTTP **200**. TDLib: one incoming SUT `updateNewMessage` at recorder +24.902s, containing the unique generated run marker. Raw text, sender and message identity were independently checked; no duplicate SUT message appeared during the completed recording.
- Producer result: `delivered=true`, `owned=true`, and the ledger's durable `noticeDelivered=true`. Model requests: **0**, as expected for a native finished-update notice.
- Native cleanup completed: owned processes/listeners stopped, credential scratch removed, and an exact-owner bounded read-only broker check observed acquire then release with no remaining lease.
- Independent read-only review confirmed the production path, fixture boundaries and observed text/order. This is text/delivery evidence on Telegram Test Server, not a visual Telegram claim or evidence of a real update, recovery or general chat health.

The initial unavailable-launcher result was repaired by the authorized task-local standalone broker bootstrap; its doctor then passed. One acquisition attempt failed before a matching lease was observed. A subsequent fixture attempt omitted the separately required command-owner role, correctly sent nothing and released its lease. The successful attempt adds that QA-only role through the guarded config writer; tracked PR source and deadlines are unchanged. No authentication repair, credential substitution or runtime fix was performed.

Sanitized observed TDLib text (only the generated marker is replaced):

```text
⚠️ OpenClaw could not complete the update. A required system check failed.
Run openclaw triage to diagnose and repair the failed update.

Details:
Reason code: node-runtime-preflight
Current health unavailable; saved verification describes the update attempt only.
Phases: requested (25ms) → staging
Failed: requested
Failed: preflight-node-runtime — [proof marker]; Node 24.15.0; requires engines.node >=24.16.0
Recorded recovery: verified serving 2026.9.1.
Recorded verification: service running (2026.9.1); version verified; channels not ready; HTTP ready.
```

Compact proof verdict:

```json
{
  "schemaVersion": 1,
  "headSha": "cd6ba7218fefea51581714b3acb12ccbcf7f5314",
  "kind": "synthetic-ledger-production-notifier-telegram-test-server",
  "scenarioCount": 1,
  "commandExitCode": 0,
  "commandDurationMs": 26990,
  "runnerExitCode": 0,
  "runnerDurationSeconds": 230.94,
  "recordingComplete": true,
  "credentialSource": "convex",
  "sutMessages": 1,
  "sendMessageStatus": 200,
  "tdlibEvent": "updateNewMessage",
  "tdlibObservedAtMs": 24902,
  "receiptMarkerMatches": true,
  "delivered": true,
  "durableNoticeDelivered": true,
  "modelRequests": 0,
  "textOrderVerified": true,
  "leaseReleased": true,
  "credentialScratchRemoved": true,
  "ownedProcessesAndListenersStopped": true
}
```

Fresh exact-head review accepted this proof. Native preparation and squash landing completed without a source change or proof waiver. Landed commit: `2558513216f8f63eae76aefa35a05f730793aa41`; all six changed file blobs were verified on main against the reviewed head.

The [hook prerequisite](https://github.com/openclaw/openclaw/pull/162866) landed at `6f56df6b5a80411ba75fb2e158dc4b7565698f1c`; this PR targets main. The [heartbeat batch](https://github.com/openclaw/openclaw/pull/162869) is separate. Reachability and `readyz` do not prove chat works.

### Source-derived before / after

Synthetic example: a failed candidate Node check, recorded recovery at one version, and a later response from another version. These are formatter inputs, not observations of a live installation.

Before:
```text
⚠️ OpenClaw update failed: preflight-node-runtime-incompatible.
Phases: staging (300ms)
Failed: preflight-node-runtime — Node 24.15.0; requires engines.node >=24.16.0
Recovery: verified serving 2026.9.1.
Recorded verification: service running; version verified; channels not ready; HTTP ready.
Current health: Gateway answered on the recorded port (2026.9.2).
Run openclaw triage to diagnose and repair the failed update.
```

After:
```text
⚠️ OpenClaw could not complete the update. A required system check failed.
Run openclaw triage to diagnose and repair the failed update.

Details:
Reason code: preflight-node-runtime-incompatible
Current health: Gateway answered on the recorded port (2026.9.2).
Phases: staging (300ms)
Failed: preflight-node-runtime — Node 24.15.0; requires engines.node >=24.16.0
Recorded recovery: verified serving 2026.9.1.
Recorded verification: service running (2026.9.1); version verified; channels not ready; HTTP ready.
```

Without a current observation, the previous failed headline could say `The gateway is running 2026.9.1.` from saved facts. That version now appears in recorded verification. Supplied current observations and the existing historical-advice qualification are retained without changing the recorded failed outcome.

<details>
<summary>Scope, contracts, and bounded follow-ups</summary>

- Presentation owner: `src/infra/update-run-report.ts`. The Node layout applies only to failed runs with `node-runtime-preflight` or `preflight-node-runtime-incompatible`; codes are preserved under Details. It does not classify failures by parsing diagnostic strings.
- The original 1,500-character markdown limit, 1,100-character selected-action allowance, and full diagnostic `lines` are preserved. Existing action precedence and profile/OCM/recovery ownership remain in place.
- CLI text consumes headline and lines; notices and overlay summaries use markdown. Structured update results and the separate Gateway tool response projection are untouched. The active-report prefix used by artifact refresh remains unchanged.
- Historical labels also apply to shared recovery/verification lines. No new health observation is performed by the formatter.
- Follow-ups remain bounded: the launcher refusal before ledger admission bypasses this renderer; the structured Gateway tool projection has its own presentation owner. Neither is folded into this batch.
- Production delta: +32/-10 (net +22) in the shared renderer, providing the bounded action-first layout and explicit observation labels. Tests: +159/-13 (net +146), including the UI readiness assertion correction.
</details>

