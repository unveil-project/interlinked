## What Problem This Solves

An MCP App tool call can still run after the operator tightens approval. `approveTool` in the same runtime snapshots whether approval is required and returns a guard that throws if approval becomes required before the tool RPC. `prepareToolCall` asked for approval when it was required, then returned nothing. `executeMcpAppOperation` therefore had no guard to run before `callMcpAppToolWithElicitation`. A Codex approval-mode or annotation change during that in-flight call was not rejected. The App cannot change the policy itself. This stops the one call that already passed the old check.

## Evidence

Production modules, not the Vitest mock of `requiresMcpCodexToolApproval`. The script imports `prepareMcpAppExtensionRuntime`, `loadSessionMcpConfig`, `resolveProjectedMcpCodexToolApprovalMode`, and `requiresMcpCodexToolApproval` from the worktree. Config is `mcp.servers.demo.codex.defaultToolsApprovalMode: "auto"`. The catalog tool starts as `readOnlyHint: true`, then the same object becomes `destructiveHint: true` after preparation. An in-process harness returns that catalog and does not spawn `demo-proof`. State dir is `/tmp/oc-f088-proof-state`.

Before, parent file `918153ea335` for `src/gateway/mcp-app-extension-runtime.ts` only. The file was restored afterward and `git diff` was empty.

```console
$ PROOF_LABEL=before-fix pnpm exec tsx /tmp/oc-f088-proof-run.ts
label: before-fix
root: /tmp/oc-f088
loadedServers: demo
serverCodex: {"defaultToolsApprovalMode":"auto"}
resolvedMode: auto
predicateReadOnly: false
predicateDestructive: true
prepareReturnType: undefined
annotationsNow: {"destructiveHint":true}
predicateAfterFlip: true
guardThrew: none
executionGuardReturned: false
leaseReleased: true
```

After, commit `cf2241e1450`:

```console
$ PROOF_LABEL=after-fix pnpm exec tsx /tmp/oc-f088-proof-run.ts
label: after-fix
root: /tmp/oc-f088
loadedServers: demo
serverCodex: {"defaultToolsApprovalMode":"auto"}
resolvedMode: auto
predicateReadOnly: false
predicateDestructive: true
prepareReturnType: function
annotationsNow: {"destructiveHint":true}
predicateAfterFlip: true
guardThrew: MCP App approval policy changed before execution
leaseReleased: true
```

Supplemental Vitest, which mocks the predicate, still passes: `node scripts/run-vitest.mjs src/gateway/mcp-app-extension-runtime.test.ts` reported 21 passed. That run is not the proof above.

## Real behavior proof

- **Behavior or issue addressed:** An in-flight MCP App `prepareToolCall` now returns a guard. The guard throws if the real Codex approval predicate becomes required before execution.
- **Real environment tested:** macOS 26.6.2 arm64, Node v26.10.0, OpenClaw commit cf2241e1450, isolated `OPENCLAW_STATE_DIR=/tmp/oc-f088-proof-state`. Invoked with `pnpm exec tsx` against production modules. No gateway process.
- **Exact steps or command run after this patch:** From `/tmp/oc-f088`, `PROOF_LABEL=after-fix PROOF_ROOT=/tmp/oc-f088 OPENCLAW_STATE_DIR=/tmp/oc-f088-proof-state OPENCLAW_CONFIG_PATH=/tmp/oc-f088-proof-state/openclaw.json OPENCLAW_SKIP_CHANNELS=1 pnpm exec tsx /tmp/oc-f088-proof-run.ts`. The before run swapped in parent `918153ea335` of `src/gateway/mcp-app-extension-runtime.ts`, ran the same command with `PROOF_LABEL=before-fix`, then restored the file.
- **Evidence after fix:** terminal output copied below.

```console
label: after-fix
loadedServers: demo
serverCodex: {"defaultToolsApprovalMode":"auto"}
resolvedMode: auto
predicateReadOnly: false
predicateDestructive: true
prepareReturnType: function
annotationsNow: {"destructiveHint":true}
predicateAfterFlip: true
guardThrew: MCP App approval policy changed before execution
leaseReleased: true
```

- **Observed result after fix:** `loadSessionMcpConfig` kept `defaultToolsApprovalMode: "auto"`. The real predicate is false for `readOnlyHint` and true for `destructiveHint`. Preparation does not open the approval dialog. On the parent file, `prepareToolCall` returns undefined while the predicate is already true, so the call would continue. On cf2241e1450 the returned function throws `MCP App approval policy changed before execution`.
- **What was not tested:** A Control UI session, a running gateway, and a live MCP server process. The harness was registered in-process and returned the catalog. If preparation had requested approval, the production `requestMcpAppToolApproval` would have thrown `MCP App approval service is unavailable`, because no approval manager was installed.

## Summary

`approveTool` already had this recheck. `prepareToolCall` now captures the same `required` flag, still requests approval only when that flag is set, and returns the guard that `executeMcpAppOperation` already invokes before the tool RPC.
