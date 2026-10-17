Related: [#162975](https://github.com/openclaw/openclaw/pull/162975), [#160884](https://github.com/openclaw/openclaw/pull/160884).

<details>
<summary>Additional instructions</summary>

**MUST:** Keep **Allow edits from maintainers** enabled for this PR so maintainers can help update the branch when needed.

</details>

## What Problem This Solves

Cancelling a worker-routed chat turn could leave the worker unable to acknowledge cancellation and finish cleanup. The `chat.abort` API succeeds, but the subsequent finishing acknowledgment fails with `placement-mismatch`, including when a preview was queued.

## Why This Change Was Made

The durable ACK refactor in [#162975](https://github.com/openclaw/openclaw/pull/162975) ([9a455598ddca](https://github.com/openclaw/openclaw/commit/9a455598ddca1b19b01b2e3824f7d558f5c64274)) applied execution-authority checks to the final cleanup acknowledgment. Cancellation has already closed that authority.

The worker run owner now supplies one narrow cancelled-finishing predicate. Receiver and RPC capture the same owner before asynchronous work and revalidate it across the durable ACK. The owner retains the existing immutable placement-claim authority, checks construction after preparation and registration callbacks, and releases resources through one idempotent cleanup path. This removes duplicate finishing policy and avoids host SQLite reads during worker commit admission.

## User Impact

The exact cancelled worker can acknowledge finishing and complete cleanup. Stale credentials, claims, owners, placements, and lifecycles remain fenced. Late previews stay rejected; cancellation does not recreate run context or invoke the provider again. Owner replacement before persistence prevents the ACK write; replacement afterward refuses a successful response while preserving committed custody.

No schema, configuration/default, stored-format, provider-model, or public protocol change.

## Evidence

```sh
pnpm test src/worker/worker.chat-abort.test.ts --maxWorkers=1
```

Same original six cases, same order:

```text
Before (exact CI c2195ee7713d22d2a2345321707c1ab4df4b6573):
Tests  2 failed | 4 passed (6)
After (before adding two ACK-boundary cases):
Tests  6 passed (6)
```

- Focused runs total **186 distinct passing cases across 12 files**, including 44 receiver and 8 composed cancellation cases. Coverage includes queued-preview resync, claim/credential/lifecycle fencing, same-claim owner replacement before and after ACK, and construction/cleanup siblings. Intermediate fixture and gate failures remain in the saved receipts; corrected affected cases pass.
- Final local candidate `e010b9b65dfa0dd5002a5cad0cda596704bf3e28`: all **8 composed cases pass** (22.317s), full changed gate passes (234.075s), and **P0-only** autoreview is scoped-clean (10.716s). All eight changed files match normal support commit `95991dac6a7ce6dcb378d55b54f4259327baca13`; required hosted CI binds to the published head.
- Real local Gateway/worker RPC and SQLite workers, fixture transport/provider, isolated Darwin arm64, Node 24.21.0. No authenticated cloud/provider or full-UI claim.
- Production **+180/-133, net +47**; tests **+203/-20, net +183**. Three unchanged result aliases move to the existing types module: +6 net import/export lines. The remaining +41 owns retained claim admission and exact construction/cleanup.


Published source: `95991dac6a7ce6dcb378d55b54f4259327baca13`. The eight changed files match the qualified isolated snapshot byte for byte; hosted CI for this normal commit remains required.
