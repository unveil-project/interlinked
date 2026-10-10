Fixes #339511

Before a Codex session's first turn, several paths can restart its thread at once — the pre-turn restart in `_sendMessage`, `_ensureCurrentLaunchBeforeTurn`, customization reconciliation, `_changeAgent` and the MCP auth reconnect. Overlapping restarts each started a thread; the turn ran on one while another was persisted as the session's thread, so the conversation was lost on resume. A send could also read the thread while it was cleared ("no backing thread"), or have it replaced after the turn was claimed.

**Changes** (`src/vs/platform/agentHost/node/codex/codexAgent.ts`)

- `ICodexSession.threadRestart`: the latest thread restart requested for the session and not yet settled.
- `_restartThreadWithCurrentTools` chains a session's restarts through `threadRestart`: each request records itself immediately and waits for the one before it. If a turn has by then been claimed (`currentTurnId`) or sent (`firstTurnSent`), it marks the session for reload instead of replacing the thread; otherwise it runs the existing restart, renamed `_restartThreadNow`. A successful restart persists its replacement thread itself (`_persistMaterializedSession`), so every caller is covered — including `_reconnectSessionsForMcpAuth`, which never persisted it — and the callers' own persistence right after the restart is removed.
- New `_ensureSettledThreadConnection`: waits until no restart is pending, then returns the thread's connection, looping if a restart was requested meanwhile. `_sendMessage` uses it after the resume step and right before both turn claims (`thread/compact/start` and `turn/start`), with no `await` between it and the claim.

Each restart is recorded at request time, not when it starts running, for two reasons: a restart queued behind another stays visible to a waiting send, so the send cannot claim its turn between the two; and a restart requested between the send's last check and its claim checks `currentTurnId` only after an `await`, so it sees the claim and reloads instead.

**Tests** (`src/vs/platform/agentHost/test/node/codex/codexPrewarmEviction.test.ts`)

A `createThreadRestartRace` helper drives a prewarmed session over the wire with that file's peer harness, holding back the first `thread/unsubscribe` and `turn/start`:

- *pre-turn thread restarts run one at a time and reload once the turn is claimed* — without the change it fails: `thread-1` is unsubscribed twice, two thread starts overlap, `turn/start` runs on `thread-3`, then a further restart unsubscribes `thread-3` under the running turn and the session persists `thread-4`.
- *a turn waiting out a thread restart also waits out a restart requested after it* — covers a restart queued behind the one a send is waiting on; a version that only waits for the restart in flight lets the turn run on `thread-2` while the queued restart persists `thread-3`.

- *an MCP auth restart under a claimed prewarm persists the replacement thread its turn runs on* — drives `handleAuthenticationToken` while a send that has claimed the prewarm waits; without the persistence in the restart, the turn runs on `thread-2` while the session's persisted thread is still `thread-1`.

With the change all three pass, and so do all Codex node unit tests (`src/vs/platform/agentHost/test/node/codex/*.test.ts`).

**Behaviour to note**

- A failed restart now fails the send waiting on it (`CodexResumeFailed` / `CodexTurnError`) instead of the send failing later with "no backing thread".

🤖 Generated with [Claude Code](https://claude.com/claude-code)
