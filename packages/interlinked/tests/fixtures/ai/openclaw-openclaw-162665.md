Related: #77717

## What Problem This Solves

An aborted Feishu startup or background identity probe can finish late and overwrite the identity held by a replacement account lifecycle.

## User Impact

A canceled lifecycle cannot clear or replace the active account’s bot identity. This addresses the stale-write defect; it does not claim to resolve every permanent-disconnection symptom in the report.

## Why This Change Was Made

Both state-writing paths now check cancellation immediately after their awaited identity probe and before publishing its result. Recovery remains tied to its existing lifecycle; no detached retry or new configuration is introduced.

## Evidence

- Recovery regression failed on the original code because a late provider result still wrote identity after abort; after the fix, all 4 recovery tests pass. `pnpm test extensions/feishu/src/monitor.bot-identity.test.ts --maxWorkers=1`: 23.91s wall, new case 14ms.
- Account-scoped production monitor regression defers the old probe, aborts it, starts a replacement, and then releases the old result. The replacement identity remains intact and only one event dispatcher starts. All 9 startup tests pass. Corresponding focused command: 526.54s cold wall, including a 183.8s worker artifact build; the added regression itself took 710ms.
- Startup baseline execution was blocked before collection by a worker-source verification failure while another independent change was in progress. The final green run used frozen sources.
- Formatting, ordinary focused lint, and `git diff --check` pass. Independent repository autoreview found no actionable P0–P2 findings.

Validation gaps: type-aware extension lint could not start because SDK declaration preparation timed out after 300s. Full build/full extension suite and live Feishu WebSocket reload were not run. CI timing is not yet available.
