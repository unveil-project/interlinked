Closes #163543
Supersedes the narrower Wait-only fix in #160450.

## What Problem This Solves

Fixes: Control UI labels active and authoritatively completed Codex tool calls as **Outcome unknown** when a status-less history placeholder or discarded native terminal item wins projection.

## User Impact

User impact: active tool rows now show **Running**, and Wait, collaboration, and subagent actions show their exact completed or failed outcome when Codex supplies one; genuinely ambiguous results remain unknown.

## Why This Change Was Made

The fix restores the existing fact precedence at both owners:

- Control UI's canonical outcome resolver falls through a status-less history activity to the live run state instead of treating object presence as a terminal fact.
- The Codex transcript projector correlates same-ID raw calls with collaboration and subagent terminal items, including output-before/outcome and outcome-before/output ordering.
- Exact `Script completed` / `Script failed` envelopes now apply to Wait as well as Exec; yielded and unrecognized envelopes stay unknown.

No fallback, config, protocol, or persistence surface is added. Production delta is +14 net lines in the Codex projector and net zero in Control UI; tests add +182 net lines across the two owner boundaries.

## Evidence

Before, the active tool row incorrectly says **Outcome unknown**:

![Control UI before: active tool row says Outcome unknown](https://github.com/user-attachments/assets/70de7a7b-ad23-4592-be71-9e6c2ab762d9)

After, the identical history and live event say **Running**:

![Control UI after: active tool row says Running](https://github.com/user-attachments/assets/82243408-1a6d-411a-943d-2500cab7bc93)

Pre-fix proofs failed for the intended reasons:

- browser fixture: expected `Running`, received `Outcome unknown`
- Control UI unit regression: expected `running`, received `unknown`
- Codex projection: completed/failed collaboration, subagent, and Wait cases retained unknown or false success

Post-fix validation:

- `node scripts/run-vitest.mjs ui/src/pages/chat/components/chat-tool-cards.node.test.ts` — 28 passed
- `node scripts/run-vitest.mjs extensions/codex/src/app-server/event-projector.output-fidelity.test.ts` — 21 passed
- isolated Control UI browser fixture — 1 passed; inspected before/after screenshots above
- `node scripts/check-changed.mjs -- extensions/codex/src/app-server/event-projector-tool-transcript.ts extensions/codex/src/app-server/event-projector.output-fidelity.test.ts ui/src/lib/chat/tool-cards.ts ui/src/pages/chat/components/chat-tool-cards.node.test.ts` — passed all selected typecheck, lint, ratchet, dead-export, boundary, and import-cycle lanes
- `.agents/skills/autoreview/scripts/autoreview --mode local --base origin/main` — no accepted/actionable findings

Codex contract checked directly in `../codex`: app-server item lifecycle and completion notifications, same-ID collaboration calls, and success-only subagent activity emission.


### Test cost

One-worker local wall times on rebased head `7601fa95ebf00b315d756e76c17033eb412264d2`:

- `extensions/codex/src/app-server/event-projector.output-fidelity.test.ts`: 41.68 s (23 tests)
- `ui/src/pages/chat/components/chat-tool-cards.node.test.ts`: 2.57 s (28 tests)
- `ui/src/pages/chat/components/chat-tool-cards.test.ts`: 4.03 s (33 tests)

Previous-head CI run [37038484099](https://github.com/openclaw/openclaw/actions/runs/37038484099) completed successfully in 1,047 seconds (17m 27s). Current exact-head CI run [37041532092](https://github.com/openclaw/openclaw/actions/runs/37041532092) is pending.
