## What Problem This Solves

Fixes: extension tests in the browser plugin (Chrome MCP connect/session, extension relay, Playwright download capture/cancel, Chromium bootstrap, window management), the Codex app-server (one-shot cleanup, node-exec readiness), Crabbox worker enrollment, and QA Lab (Gateway child lifecycle and startup lease, lab server, Matrix CLI scenarios, Mantis runs, suite process lifecycle) fail on a loaded host when a fixture child outlasts a wall-clock wait (1–15 s `vi.waitFor`/`expect.poll` defaults, `waitForFile`/PID polls), because they poll files, PIDs, and the process table.

## User Impact

No user-visible change. These suites stop failing spuriously on slow machines; a missing readiness or exit now fails at its owning step or the Vitest test timeout.

## Why This Change Was Made

Part of the polling audit from #162274, following #162674's extension conversions. Waits now await owned promises, callbacks, process events, and fixture receipts (with durable-record fallback where the product owns the child), and cleanup that must survive a test timeout is joined instead of abandoned. Extensions take the shared helpers only from the local-only `openclaw/plugin-sdk/test-fixtures` facade (no `test/helpers/**` imports), and use native `Promise.withResolvers` instead of a deferred helper. Obsolete local polling helpers are removed.

While proving the browser group, the lane also repaired a pre-existing cross-file contamination in `chrome-mcp.snapshot-identity.test.ts`: it imported real hooks through the public facade that neighboring route tests mock, so `setChromeMcpSessionFactoryForTest` could be undefined at runtime. It now imports from the owning modules, the same pattern #162692 applied to `server-context.list-profiles.test.ts`; a deterministic probe (facade mock without the setter) fails the old bytes and passes the new ones.

Deliberately unchanged (seven sites): Crabbox enrollment stop/cleanup waits whose worker is detached and unref'd with its parent gone, a Codex transport snapshot test that skips on Linux and Windows (Mac-only), and a few foreign-PID extinction checks without an owned reap signal. No product source, test timeout, product timeout, or assertion meaning changed.

Release-note context: test-only change, no user-visible behavior change.

<details><summary>Per-site conversions</summary>

Old coordinates are those supplied in the work order. Categories: **1** existing owned completion/callback; **2** test-child IPC/pipe/stdout readiness; **3** product-child fixture receipt; **4** direct assertion after an operation that guarantees the state; **5** one deadline-free, test-signal-bound observation where an exact foreign-process join is unavailable. Receipt races consult records written before the operation can settle. Body waits preceding cleanup use `withinTest`; relevant parameterized cases use `it.for`.


### Browser

| Site (old line from order) | Old observation | Replacement | Category / class | Evidence |
| --- | --- | --- | --- | --- |
| `extensions/browser/chrome-extension/bootstrap.chromium.test.ts:316` | manifest `expect.poll`, 15 s | `onProgress` completion deferred, raced against install settlement, bound to test signal; one exact manifest read | 1 / B | `extension-install.ts:151` awaits registration; `:191-194` emits native-ready after the registration loop and before discovery waiting. Existing exact manifest validator remains. Installer receives test signal so timeout also retires ongoing install. |
| `extensions/browser/src/browser/chrome-mcp-connect.test.ts:116` | helper `vi.waitFor`, 1 s after reset | direct PID/stdin-ended assertion after `resetChromeMcpSessionsForTest` | 4 / C | `chrome-mcp-session.ts:396` reset awaits stopOwners; owner stop/close joins `closeChromeMcpSessionHandle`, whose `chrome-mcp-process.ts:343-345` awaits transport close and tracked tree cleanup; `:259-261,312-315` only return after absence. Fixture writes stdin-ended synchronously before EOF shutdown. |
| `extensions/browser/src/browser/chrome-mcp-connect.test.ts:168` | same helper, 1 s after failed attach | direct PID/stdin-ended assertion after rejected attempt | 4 / C | `chrome-mcp-connect.ts:90-95` awaits owner close and stderr finish before raising attach error; session acquire catches/joins cleanup. Same tree-absence owner as preceding row. |
| `extensions/browser/src/browser/chrome-mcp-connect.test.ts:211` | same helper, 1 s after explicit close | direct PID/stdin-ended assertion after resolved close | 4 / C | closeChromeMcpSession awaits stopOwners (`chrome-mcp-session.ts:390-391`); exact transport/tree owner joins described above. |
| `extensions/browser/src/browser/extension-relay/relay-coexistence.e2e.test.ts:71` | owned stdout/stderr readiness + 10 s timer | same output event promise and early error/exit listeners, bound to test signal | 1 / A | Test directly spawns child and pre-registers events; catch still SIGTERMs/joins its existing done event. No extra startup timer. |
| `extensions/browser/src/browser/extension-windows-management.test.ts:168` | EOF marker `vi.waitFor`, 1 s | fixture receipt after durable marker; settlement branch confirms marker if socket loses the race; wait bound to test signal | 3 / A | Fixture drains stdin, writes marker synchronously, then sends receipt. `runWindowsManagement` owns child's stdout, so channel is test-owned side transport. Finally aborts AND joins rejected operation. This file runs real Node fixtures on Linux; it is not native-Windows-only. |
| `extensions/browser/src/browser/pw-download-cancel.chromium.test.ts:531` | output directory `expect.poll`, 1 s | recorded real output-writer promise settlement, then directory assertion | 1 / B | `pw-download-capture.ts:139-146` rejects capture without joining background write; writer forwards `writeExternalFileWithinOutputRoot` exact promise, untouched. It joins fs-safe staged cleanup before settlement. |
| `extensions/browser/src/browser/pw-download-capture.test.ts:194` | partial file `vi.waitFor`, 1 s | real output-writer settlement, then exact ENOENT | 1 / B | Same output owner. Adjacent timed-out-save case (`:247` on base) had the same poll and is converted too. saveStarted waits also bound to test signal before finally. |
| `extensions/browser/src/browser/pw-tools-core.download-current-document.live.test.ts:200` | directory restored `expect.poll`, 1 s | real output-writer settlement IF admitted, then unchanged directory comparison | 1 / B | Caller abort is synchronous; `pw-download-capture.ts:60` fences all later writer admissions before `:68`. Existing HTTP response readiness can precede admission, so absent recorded call means no later writer can start; admitted writer completion still awaited. |
| `extensions/browser/src/browser/pw-tools-core.download-current-document.test.ts:187` | directory empty `vi.waitFor`, 1 s | real output-writer settlement then empty-directory assertion | 1 / B | Caller/navigation/close variants all cancel from within mock saveAs; writer is already admitted. Same output owner. |

### Codex

| User old site | Old helper/deadline | New signal/category | Class | Ordering or residual reason |
|---|---|---|---|---|
| extensions/codex/src/app-server/run-attempt-one-shot-cleanup.test.ts:317 | stopTaskOwnedProcess → expect.poll / 2000 ms | one local signal-bound foreign-PID extinction check (5) | B | Detached descendants outlive deliberately killed/retired root; no surviving ChildProcess owner can report their reaping. Rescue always sends SIGKILL before observing, including after test abort. |
| extensions/codex/src/app-server/run-attempt-one-shot-cleanup.test.ts:298 | expect.poll/isPidAlive / 2000 ms | same residual for expected dead (5); direct retained-PID assertion (4) | C | Root and run already awaited; descendant PID is written before readline accepts requests and emits turn/started (now lines 239,258). Unknown/retired variants deliberately retain the child, so read that already-produced state directly. |
| extensions/codex/src/app-server/run-attempt.skills.native.test.ts:261 | stderr readiness promise + startupTimer / 15000 ms | existing stderr listener plus existing early error/exit observers, withinTest (1) | B | Listening banner is owned by native child; no second deadline competes with cold startup. Abort enters existing native-process cleanup. |
| extensions/codex/src/app-server/transport-process-snapshot.test.ts:475 | expect.poll/isPidAlive / 1000 ms | unchanged, Mac-deferred | B | Owning describe skips both Linux and Windows. Authorized Blacksmith Linux proof cannot execute these lines; lead agreed to defer rather than claim skipped tests as proof. |
| extensions/codex/src/app-server/transport-startup.test.ts:141 | expect.poll PID file / 1000 ms | fixture-receipts readiness, withinTest (3) | A | Generated native fixture writes PID before receipt; race against wrapper close consults durable PID record so unordered receipt delivery cannot manufacture failure. |
| extensions/codex/src/app-server/transport-startup.test.ts:173 | expect.poll/process snapshot / 5000 ms | one local signal-bound process-snapshot residual (5) | A | Inherited-pipe child is killed with its wrapper, so wrapper close alone cannot prove extinction and neither process can emit post-SIGKILL reaping. Keeps original observer-presence assertion and absent-or-zombie semantics. Individual reader's existing 2000-ms product inspection budget remains unchanged; outer test polling deadline removed. |
| extensions/codex/src/node-cli-sessions.test.ts:399 | vi.waitFor readiness file / 1000 ms | fixture-receipts readiness raced against command settlement using durable record, withinTest (3) | A | Fixture writes ready before reporting it or starting its delayed write; command-first branch checks durable file. Added finally abort + command join protects timed-out test body. |
| extensions/codex/src/node-exec-server.readiness.test.ts:204 | vi.waitFor workspace/HOME cleanup / 1000 ms | existing workspace.release callback retained as deferred, withinTest (1) | B | node-exec-server.runtime.ts:222-229 awaits output/writes and temporaryHome.cleanup before releaseResources calls workspace.release; observing release preserves autonomous cleanup proof and avoids invoking onDisconnect to cause it. |

### Crabbox

| Site | Old wait/deadline | New signal/category | Class | Ordering/ownership |
|---|---|---|---|---|
| extensions/crabbox/src/crabbox-worker-desktop-setup.test.ts:52 | Python monotonic browser.pid poll, 5 s | Inherited readiness pipe; category 2 | A | Browser writes and atomically renames PID before reporting the same PID on the inherited descriptor. Python asserts durable PID matches it. |
| extensions/crabbox/src/crabbox-worker-desktop-setup.test.ts:63 | Popen.communicate(timeout=5) | Existing owned launcher completion and pipe drain; category 1 | B | Browser remains alive; only launcher exits/releases lock. |
| extensions/crabbox/src/crabbox-worker-desktop-setup.test.ts:81 | Popen.communicate(timeout=5) rescue/final join | Same retained Popen completion; category 1 | C | Healthy communicate already settled; rescue terminates first, then joins. Existing subreaper still waits for every adopted child. |
| extensions/crabbox/src/crabbox-worker-node-enrollment.test.ts:898 | Shell 200×25 ms launch.json retry | Fixture-owned named readiness pipe; category 2/3 | A | Worker publishes launch.json before writing pipe. Test holds O_RDWR descriptor so earlier publication cannot block. Live replay directly observes already-published launch.json. |
| extensions/crabbox/src/crabbox-worker-node-enrollment.test.ts:653 | readLaunch, 30 s | Standard receipt tagged state directory + exact PID; category 3 | B | Product launchNodeProcess writes node.pid before returning; fixture atomically renames JSON before sending receipt. |
| extensions/crabbox/src/crabbox-worker-node-enrollment.test.ts:683 | readLaunch, 30 s | Same receipt, replacement PID | B | State source is stable; PID-tagged line distinguishes replacement from earlier ready receipts. |
| extensions/crabbox/src/crabbox-worker-node-enrollment.test.ts:762 | readLaunch, 30 s | Same receipt | B | Same ordering. |
| extensions/crabbox/src/crabbox-worker-node-enrollment.test.ts:771 | readLaunch, 30 s | Same receipt, replacement PID | B | Same ordering. |
| extensions/crabbox/src/crabbox-worker-node-enrollment.test.ts:782 | readLaunch, 30 s | Same receipt | B | Same ordering. |
| extensions/crabbox/src/crabbox-worker-node-enrollment.test.ts:877 | readLaunch, 30 s | Same receipt | B | Same ordering. |
| extensions/crabbox/src/crabbox-worker-node-enrollment.test.ts:948 | readLaunch, 30 s | Same receipt | B | Same ordering. |
| extensions/crabbox/src/crabbox-worker-node-enrollment.test.ts:793 | readLaunch of prior launch, 30 s | Saved previously-returned launch record; category 4 | C | Earlier read at old782 awaited the exact worker's receipt; live replay asserts unchanged node.pid before consuming launch.cli. |
| extensions/crabbox/src/crabbox-worker-node-enrollment.test.ts:35,680,767 | stop/cleanup vi.waitFor, 5 s | **STOP; unchanged** | B | Worker is detached and unref'd; enrollment parent has exited. Neither signal delivery nor a child-authored final receipt proves OS exit/reaping. Exact join requires fixture reaper ownership not currently exposed cross-platform; a test-signal residual is unsafe during afterEach after timeout. Lead agreed to retain these escape-hatch sites. |

### QA scenario and Mantis fixtures

| Old site | Old wait/deadline | New signal/category | Class | Ordering or retained residual |
|---|---|---|---|---|
| extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-cli-stream-error.test.ts:139 | waitForFile / 2000 ms | Grandchild IPC ready relayed to parent stdout, existing child observer deferred; category 1/2 | A | Grandchild installs handler and writes ready file before `process.send`; parent forwards after its PID write. Owned stdout race fails fast against session settlement. |
| extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-cli-stream-error.test.ts:138 | waitForPidFile / 2000 ms | Direct read after relayed readiness; category 4 | C | Fixed lines 47–59 write ready/PID records before forwarding readiness; lines 115–127 await it before reads. |
| extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-cli.test.ts:465,466 | waitForPidFile / 2000 ms | Fixture receipt plus durable PID records on earlier session settlement; category 3 | A | Fixed lines 469–475 publish both records before sending. Separate socket and session completion are deliberately unordered; the losing operation path checks those records. |
| extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-cli.test.ts:472,473 | waitForProcessExit / 2000 ms | Session settlement first, then one signal-bound residual PID-absence helper; category 1/5 | A | `posix-command-settlement.ts:83` gates settlement on cleanup and stdio drain; `posix-process-stat.ts:68` permits definitely-dead zombies. No exact foreign PID reaping join is exposed. |
| extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-cli.test.ts:358 | waitForProcessExit / 2000 ms | Same signal-bound residual; category 5 | A | This case must attach its first `session.wait()` only after exit, to preserve late attachment coverage. Waiting on session settlement first would weaken that test. |
| extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-cli.test.ts:313 | waitForPidFile / 5000 ms | Direct validated read; category 4 | C | Fixed lines 310–313 write PID before existing `waiting despite graceful shutdown` readiness; line 330 reads after awaiting output. |
| extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-cli.test.ts:355 | waitForPidFile / 5000 ms | Direct validated read; category 4 | C | Fixed lines 357–359 write PID before existing `late wait timeout marker`; line 372 reads after output. |
| extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-cli.test.ts:411,412 | waitForPidFile / 5000 ms | Direct validated reads; category 4 | C | Fixed lines 404–408 publish both PIDs before `spawned persistent descendant`; combined parent/descendant output is awaited before lines 428–429 read them. |
| extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-tool-progress.test.ts:78,90 | consumeGate / default 1000 ms | Deferred from real `mkdir` completion; category 1 | B | Partial fs mock calls the actual mkdir first (fixed lines 15–24), then publishes. Both tests retain empty-directory and removal checks; finally removes/releases and joins on abort. |
| extensions/qa-lab/src/mantis/cli-interrupts.process.test.ts:119 | withTimeout(closed) / 3000 ms | Existing pre-registered close promise bound to test signal; category 1 | B | Child cleanup release still precedes close; stdout completion and exit status assertions are unchanged. |
| extensions/qa-lab/src/mantis/cli-interrupts.process.test.ts:129 | withTimeout(closed) / 3000 ms | Existing close promise after rescue SIGKILL; category 1 | C | Finally now joins the exact child event rather than racing reaping against another deadline. |
| extensions/qa-lab/src/mantis/run.runtime.process.test.ts:400,401 | readPidBeforeSettled / 5000 ms | Receipt from shell fixture after PID publication, durable PID fallback if run settles first; category 3 | A | Fixed lines 122–140 publish shell identity before socket send. Abort waits for both receipts. |
| extensions/qa-lab/src/mantis/run.runtime.process.test.ts:483,484 | readPidBeforeSettled / 5000 ms | Same receipt and durable fallback; category 3 | A | Same fixture owner and predicate as abort case. Existing QA deadline is unchanged. |
| extensions/qa-lab/src/mantis/run.runtime.process.test.ts:415 parent/descendant | waitForDead / 2000 ms | Run settlement, then one signal-bound residual; category 5 | C | `run-command.runtime.ts:157` requests tree extinction, `exec-runner.ts:570` joins cleanup, but `exec-termination.ts:139` schedules adopted-zombie reaping asynchronously without an exposed join. |
| extensions/qa-lab/src/mantis/run.runtime.process.test.ts:499 parent/descendant | waitForDead / 2000 ms | Same run settlement + residual; category 5 | C | Preserves exact kill(pid,0) absence after QA timeout, not merely live-group extinction. |

### QA lifecycle, catalog, and suite process

| Site | Old wait / deadline | New signal / category | Class | Ordering / residual |
|---|---|---|---|---|
| extensions/qa-lab/src/gateway-child-lifecycle.test.ts:499 | vi.waitFor log text / 1000 ms | actual stdoutLog.write callback followed by same file-content assertion (1) | B | gateway-child.ts:118-125 forwards child output into stdoutLog; test forwards real write and resolves only its successful callback. Accumulation handles split chunks. |
| extensions/qa-lab/src/gateway-child-lifecycle.test.ts:507 | same / 1000 ms | same callback, distinct final-output gate (1) | B | No fixture-authored receipt substitutes for stream-to-file completion. Both gates use withinTest before existing signal-restoration finally. |
| extensions/qa-lab/src/gateway-child-lifecycle.test.ts:43 | afterEach group extinction vi.waitFor / 1000 ms | STOP unchanged | B | Forced-kill rescue after owner.stop has no surviving ChildProcess for orphan group members. Test context may already be aborted; reusing that signal would abandon cleanup. Exact group reaper requires a separate fixture ownership change. |
| extensions/qa-lab/src/gateway-startup-lease.integration.test.ts:320 | next heartbeat log count vi.waitFor / 1000 ms | deferred resolved by existing synthetic broker heartbeat handler after log append (1) | B | Gate is installed after suite rejection, preserving requirement that heartbeat continues while group signaling is denied. withinTest reaches fault-restoration finally. |
| extensions/qa-lab/src/gateway-startup-lease.integration.test.ts:338 | Date.now group snapshot loop / 5000 ms | STOP unchanged | B | This is finally-owned orphan rescue after restoring real signals; no live parent remains to report exact extinction, and already-aborted body signal cannot safely own teardown. |
| extensions/qa-lab/src/lab-server.test.ts:1480 | waitForFileContent / 5000 ms | standard fixture receipt after handler installation and durable marker, then same marker assertion (3) | A | Generated catalog fixture writes marker before sendReceipt and stays alive. Bootstrap HTTP response is not catalog completion, so no race against it is introduced. |
| extensions/qa-lab/src/lab-server.test.ts:1485 | waitForFileContent / 5000 ms | direct read following lab.stop (4) | C | lab-server.ts:864-865 aborts and joins catalog promise; model-catalog.runtime.ts:124 awaits runCommandWithTimeout; SIGTERM handler writes stopped file synchronously before process.exit. |
| extensions/qa-lab/src/suite-process-lifecycle.test.ts:264 | waitForCompletedSummary / 420000 ms | test CLI fixture reports exact terminal-summary atomic rename over IPC; process-close branch consults durable summary (2) | B | suite-artifacts.ts:26-44 awaits fs-safe replaceFileAtomic; installed fs-safe0.21.2 replace-file.js:26 calls default fs.promises.rename, forwarded by fixture. Node IPC observation adds no product hook. |
| extensions/qa-lab/src/suite-process-lifecycle.test.ts:270 | waitForProcessClose timer race / 45000 ms | existing pre-registered run.closed, withinTest (1) | B | Exact child close joins process and pipes. Enclosing test timeout remains495000ms; afterEach still owns force-stop and join. |

The equivalent timed-out staged-download cleanup poll adjacent to `pw-download-capture.test.ts:194` was converted through the same real writer promise. Related local marker/timeout helpers were retired when their consumers moved to owned signals; unrelated negative waits and unassigned product timers remain.

Four fixture/ownership findings were handled in the same test-only lane:

- A truncated bootstrap response sometimes retained its first byte before disconnect. The shipped retry owner correctly resets its failure budget when retained bytes advance, giving either three or four requests. The fixture now sends zero bytes under the declared full length, preserving body-abort diagnostics and the existing exact three-request assertion. The unchanged downloader sibling still proves retained-progress retries; history: `2dd109158a1f`.
- The asynchronous Python launcher conversion made a timeout cleanup race observable: Vitest can enter `afterEach` before the body's async `finally` finishes. The temp-directory owner now joins the exact Python close promise before deleting the stop marker/root. Forced-abort proof checks closed-before-temp-remove and absence of Python, launcher, and browser PIDs.
- Matrix's manual-kill fixture likewise needed its cleanup lifetime retained across Vitest timeout. `finally` alone starts the original cleanup; `onTestFinished` joins the deferred that assimilates that same complete cleanup promise. Forced-abort proof now waits through the real escalation and confirms both PIDs absent.
- The Chromium click fixture retained a Frame before later target discovery could reconnect the managed browser. Its observer could miss an actual native click, then report `Action settled before native admission` after the unchanged five-second timeout. One forwarding spy on the existing page resolver now observes the exact returned Page for click, fill, upload, and dialog cases. An identical forced connection refresh fails the original click/upload cases and passes the repaired cases; no alternate action path or timeout increase was used.

Cross-file basename searches under `src test scripts extensions` found inventories/build-routing references and the intended test-support imports, but no imports/emulations of the changed test bodies. No emulated Vitest contexts needed changes. Root/scoped guides, `test/helpers/AGENTS.md`, test-authoring guidance, and both requested precedents were read. The lead personally inspected sibling Codex `codex-rs/app-server/src/lib.rs:716` and `:1198`, `codex-rs/app-server-transport/src/transport/websocket.rs:57` and `:145`, and `codex-cli/bin/codex.js:241`; the native banner follows listener bind, and the CLI inherits pipes/forwards signals/joins its native child.

</details>

### Stops, residuals, and deliberately unconverted sites

| Requested site(s) left unchanged | Reason |
| --- | --- |
| `extensions/browser/src/browser/chrome-mcp-connect.test.ts:122` | Diagnostic orphan rescue runs after the fixture parent can already be reaped. No retained exact child/reaper handle exists; a pre-exit receipt is not extinction proof. Binding teardown to an already-aborted body signal would abandon cleanup. |
| `extensions/crabbox/src/crabbox-worker-node-enrollment.test.ts:35,680,767` | Three detached-worker rescue waits retain their five-second checks. The enrollment parent has exited and no cross-platform exact reaper completion is exposed. A separate fixture ownership change is needed; signaling or a child-authored last message would weaken the assertion. |
| `extensions/qa-lab/src/gateway-child-lifecycle.test.ts:43` | AfterEach rescue has only foreign process-group identity after owner stop. Exact orphan reaping is not exposed; the aborted test signal cannot safely own teardown. |
| `extensions/qa-lab/src/gateway-startup-lease.integration.test.ts:338` | Finally-owned rescue restores real signaling and force-kills an orphaned group. There is no surviving parent handle to join extinction. Existing five-second loop remains. |
| `extensions/codex/src/app-server/transport-process-snapshot.test.ts:475` | The relevant describe skips Linux and Windows; it is Darwin-only. Authorized Blacksmith Linux proof cannot exercise the inspector-death case, so it was left unchanged. |

No Windows-native-only case was converted. `extension-windows-management.test.ts` is a cross-platform real-Node ABI fixture and executed on Linux. The pending short-TMPDIR receipt-helper capability was absent when inspected; none of the permitted Linux proofs required it, and no shared helper was edited.

**Additional verification blocker: shared browser module state.** In the initial full browser shard, replay one passed and replay two failed 64 cases in unchanged `chrome-mcp.test.ts` because `setChromeMcpSessionFactoryForTest` was undefined. On the corrected final source, that file passed alone (64 tests); browser replay one passed 3,534 tests, but replay two failed 16 cases in two different untouched files, `chrome-mcp.snapshot-identity.test.ts` and `server-context.list-profiles.test.ts`, with missing setter/reset exports. Source guarantees those exports. Multiple incomplete facade mocks and `isolate: false` implicate shared evaluation/retirement, but the exact producer is unproven; plain TypeError also differs from Vitest's usual missing-manual-mock-export diagnostic. No unmock/importActual/direct-owner-import workaround or isolation override was applied. Coordinator follow-up: capture per-worker predecessor/admission and facade/export/mock metadata in the failing full order, then investigate the shared runner/dependency owner. Printed completion order alone does not prove a predecessor. The third browser replay was deliberately not retried after failure.

**Independent review: authentication STOP.** The configured Codex reviewer returned HTTP `401 Unauthorized`; `autoreview-final-status.json` says `reviewer_unavailable`, no report produced. In accordance with the work order, this step stopped without credential-store access, authentication repair, or another attempt. The coordinator owns the review. This is an authentication failure, not a clean review or an automatic approval rejection.

## Evidence

All proof ran on Blacksmith Testbox through `node scripts/crabbox-wrapper.mjs` one-shot runs; no local Vitest.

### Standalone repetitions (flake-triage bar)

Ten sequential runs per original file, plus twenty clean runs of the newly repaired snapshot-identity file; at most four distinct files at once. Default command: `CI=1 pnpm test <file> --maxWorkers=1`. Relay E2E and current-document live tests use the exact positional configs listed in `resume-routing.md`; live opt-in is set only for the synthetic current-document case. The private QA runtime is built once per Testbox before concurrent readers, Chromium is provisioned remotely, and browser opt-ins are explicit. Original before-change walls remain in the earlier report; this table records fresh post-rebase walls.

| File | Passes | Per-run wall min / median / max | Test summary |
| --- | --- | --- | --- |
| `extensions/browser/chrome-extension/bootstrap.chromium.test.ts` | 10/10 | 61.619 / 65.203 / 78.498s | Tests  1 passed (1) |
| `extensions/browser/src/browser/extension-relay/relay-coexistence.e2e.test.ts` | 10/10 | 30.339 / 36.267 / 47.874s | Tests  1 passed (1) |
| `extensions/browser/src/browser/extension-windows-management.test.ts` | 10/10 | 18.851 / 24.033 / 35.924s | Tests  13 passed (13) |
| `extensions/browser/src/browser/pw-download-cancel.chromium.test.ts` | 10/10 | 27.488 / 33.750 / 46.301s | Tests  12 passed (12) |
| `extensions/browser/src/browser/pw-download-capture.test.ts` | 10/10 | 20.800 / 23.898 / 27.752s | Tests  8 passed (8) |
| `extensions/browser/src/browser/pw-tools-core.download-current-document.live.test.ts` | 10/10 | 31.480 / 36.350 / 47.768s | Tests  5 passed (5) |
| `extensions/browser/src/browser/pw-tools-core.download-current-document.test.ts` | 10/10 | 22.438 / 26.510 / 35.614s | Tests  16 passed (16) |
| `extensions/codex/src/app-server/run-attempt-one-shot-cleanup.test.ts` | 10/10 | 57.277 / 61.376 / 84.036s | Tests  9 passed (9) |
| `extensions/codex/src/app-server/run-attempt.skills.native.test.ts` | 10/10 | 42.265 / 47.755 / 71.269s | Tests  4 passed (4) |
| `extensions/codex/src/app-server/transport-startup.test.ts` | 10/10 | 29.113 / 32.837 / 45.198s | Tests  4 passed (4) |
| `extensions/codex/src/node-cli-sessions.test.ts` | 10/10 | 26.468 / 31.239 / 45.627s | Tests  28 passed (28) |
| `extensions/codex/src/node-exec-server.readiness.test.ts` | 10/10 | 26.241 / 30.866 / 38.211s | Tests  8 passed (8) |
| `extensions/crabbox/index.test.ts` | 10/10 | 25.497 / 28.672 / 45.711s | Tests  8 passed (8) |
| `extensions/crabbox/src/crabbox-worker-bootstrap-download.test.ts` | 10/10 | 22.115 / 24.450 / 34.810s | Tests  46 passed (46) |
| `extensions/crabbox/src/crabbox-worker-desktop-setup.test.ts` | 10/10 | 24.273 / 25.161 / 36.450s | Tests  13 passed (13) |
| `extensions/crabbox/src/crabbox-worker-node-enrollment-replay.test.ts` | 10/10 | 22.336 / 23.810 / 34.973s | Tests  42 passed (42) |
| `extensions/crabbox/src/crabbox-worker-node-enrollment-windows.test.ts` | 10/10 | 21.255 / 23.247 / 30.746s | Tests  32 passed (32) |
| `extensions/crabbox/src/crabbox-worker-node-enrollment.test.ts` | 10/10 | 32.477 / 34.406 / 47.681s | Tests  28 passed (28) |
| `extensions/crabbox/src/crabbox-worker-prepared-image.test.ts` | 10/10 | 31.764 / 33.320 / 47.027s | Tests  17 passed (17) |
| `extensions/crabbox/src/crabbox-worker-project.test.ts` | 10/10 | 46.597 / 50.916 / 58.344s | Tests  74 passed (74) |
| `extensions/crabbox/src/crabbox-worker-provider-desktop.test.ts` | 10/10 | 23.390 / 24.365 / 32.955s | Tests  11 passed (11) |
| `extensions/crabbox/src/crabbox-worker-provider.test.ts` | 10/10 | 25.791 / 28.262 / 33.837s | Tests  115 passed (115) |
| `extensions/crabbox/src/crabbox-worker-provision-cancellation.test.ts` | 10/10 | 26.181 / 29.191 / 38.729s | Tests  11 passed (11) |
| `extensions/crabbox/src/crabbox-worker-read-budget.test.ts` | 10/10 | 24.103 / 26.820 / 34.737s | Tests  5 passed (5) |
| `extensions/crabbox/src/crabbox-worker-stop-lifetime.test.ts` | 10/10 | 25.874 / 28.146 / 37.124s | Tests  6 passed (6) |
| `extensions/crabbox/src/crabbox-worker-stop.test.ts` | 10/10 | 24.592 / 27.341 / 40.819s | Tests  4 passed (4) |
| `extensions/crabbox/src/crabbox-worker-warm-image-allocation.test.ts` | 10/10 | 39.282 / 42.912 / 54.309s | Tests  26 passed (26) |
| `extensions/crabbox/src/crabbox-worker-warm-image-lifecycle.test.ts` | 10/10 | 37.004 / 40.668 / 49.649s | Tests  17 passed (17) |
| `extensions/crabbox/src/crabbox-worker-warm-image-maintenance.test.ts` | 10/10 | 36.128 / 41.861 / 48.904s | Tests  23 passed (23) |
| `extensions/crabbox/src/crabbox-worker-warm-image-recovery.test.ts` | 10/10 | 28.563 / 33.883 / 42.441s | Tests  8 passed (8) |
| `extensions/crabbox/src/crabbox-worker-warm-image-retirement.test.ts` | 10/10 | 43.522 / 47.722 / 52.877s | Tests  25 passed (25) |
| `extensions/crabbox/src/crabbox-worker-warm-image-store.test.ts` | 10/10 | 32.034 / 36.052 / 39.825s | Tests  14 passed (14) |
| `extensions/crabbox/src/crabbox-worker-warm-image.test.ts` | 10/10 | 46.696 / 55.308 / 69.264s | Tests  68 passed (68) |
| `extensions/qa-lab/src/gateway-child-lifecycle.test.ts` | 10/10 | 46.227 / 52.540 / 83.739s | Tests  19 passed (19) |
| `extensions/qa-lab/src/gateway-startup-lease.integration.test.ts` | 10/10 | 44.530 / 48.186 / 79.510s | Tests  4 passed (4) |
| `extensions/qa-lab/src/lab-server.test.ts` | 10/10 | 28.183 / 33.706 / 45.945s | Tests  33 passed (33) |
| `extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-cli-stream-error.test.ts` | 10/10 | 19.725 / 25.319 / 30.539s | Tests  3 passed (3) |
| `extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-cli.test.ts` | 10/10 | 22.774 / 27.441 / 31.886s | Tests  12 passed (12) |
| `extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-tool-progress.test.ts` | 10/10 | 21.631 / 25.742 / 29.132s | Tests  6 passed (6) |
| `extensions/qa-lab/src/mantis/cli-interrupts.process.test.ts` | 10/10 | 20.839 / 24.793 / 31.741s | Tests  3 passed (3) |
| `extensions/qa-lab/src/mantis/run.runtime.process.test.ts` | 10/10 | 22.367 / 27.243 / 38.304s | Tests  7 passed (7) |
| `extensions/qa-lab/src/suite-process-lifecycle.test.ts` | 10/10 | 66.474 / 69.776 / 81.317s | Tests  1 passed (1) |
| `test/extension-test-boundary.test.ts` | 10/10 | 25.021 / 30.245 / 46.435s | Tests  20 passed (20) |
| `extensions/browser/src/browser/chrome-mcp.snapshot-identity.test.ts` | 20/20 | 15.158 / 16.889 / 21.832s | Tests  9 passed (9) |

Healthy wall measurement for the newly touched snapshot file (same one-shot Testbox; original bytes restored to fixed bytes in finally):

- `baseline-before`: 24.625s; exit 0;  Test Files  1 passed (1);       Tests  9 passed (9);    Duration  22.59s (transform 91%, import 5%, worker 3%, setup 1%)
- `baseline-after`: 22.459s; exit 0;  Test Files  1 passed (1);       Tests  9 passed (9);    Duration  20.72s (transform 91%, import 6%, worker 2%, setup 1%)

### Proof (from the lane report)

All source tests ran on Blacksmith Testbox through the prescribed one-shot wrapper. The E2E/live config replays are **targeted supplemental proof**, not invented full Node CI shards. `createNodeTestShardBundles()` excludes full-extensions; the actual extension owner inventories came from the existing changed-extension planner. Exact inventories/configs/commands are retained in `proof-routing.json`, the execution manifests, and `proof-summary.json`.

The existing suites exercise real Node/Python/native Codex/Chromium startup, cancellation, process-tree cleanup, and native staging-file ownership. A fake process or fabricated completion would not preserve those contracts. Costs below include compiler/runtime preparation and contention; cold original/fixed-smoke walls and warmed repetition distributions are reported separately and are not a performance benchmark. No enclosing test budget, production grace, or worker pin was changed to get a pass.

Final local checks on all 26 changed files passed: `node_modules/.bin/oxfmt --check <files>`; `node_modules/.bin/oxlint --type-aware --tsconfig extensions/tsconfig.json <files>`; `git diff --check`; and `node --import ./scripts/tsx.mjs scripts/check-test-timeout-race-ratchet.mts --base origin/main`. See `static-checks-commit-bytes.log`. Ratchet result: 157 files, 377 grandfathered sites. No touched row's identifier count decreased, so no baseline edit was warranted. The final remote `pnpm tsgo:extensions:test` passed in 87.661 seconds.


### Commands and receipts

All remote campaigns used one-shot `node scripts/crabbox-wrapper.mjs run --timing-json -- bash -c "$(cat <payload.sh>)" > <log> 2>&1`. Final readers use prepared private-QA dist, verified native-host/relay entries, installed Chromium, and `OPENCLAW_E2E_USE_PREBUILT_DIST=1`. Four distinct standalone files may overlap; repetitions of a file and full owning shards remain sequential. Exact commands, 20 individual walls per file, test-count lines, skips, and coverage facts are retained in `proof-summary.json`.

| Log / payload | Testbox | Actions | Wrapper exit | Command wall s |
| --- | --- | --- | ---: | ---: |
| `focused-compact.log` / `focused-compact.sh` | tbx_01m3vnjtcsbbffenjf5p3n506k | https://github.com/openclaw/openclaw/actions/runs/36859304862 | -1 | 832.533 |
| `focused-corrected.log` / `focused-corrected.sh` | tbx_01m3vpk5f0s476gtvccqbgq8dh | https://github.com/openclaw/openclaw/actions/runs/36861212508 | 0 | 718.535 |
| `probes-all.log` / `probes-all.sh` | tbx_01m3vqfq2nrw9ngk67yv5bpq5c | https://github.com/openclaw/openclaw/actions/runs/36862953179 | 1 | 922.286 |
| `probes-repro.log` / `probes-repro.sh` | tbx_01m3vrya2kx4c8s5cprp5najzd | https://github.com/openclaw/openclaw/actions/runs/36865883386 | 1 | 316.655 |
| `qa-receipt-repro.log` / `qa-receipt-repro.sh` | tbx_01m3vsw20j9sz36q7npc1cgmvr | https://github.com/openclaw/openclaw/actions/runs/36867758155 | 1 | 167.635 |
| `final-clean.log` / `final-clean.sh` | tbx_01m3vtf27darj42mg9xyvk8x9f | https://github.com/openclaw/openclaw/actions/runs/36869020189 | -1 | 6215.485 |
| `completion-proof.log` / `completion-proof.executed.sh` | tbx_01m3w0ppkhhttn8v6tq435psfa | https://github.com/openclaw/openclaw/actions/runs/36883173083 | -1 | 3677.428 |
| `remaining-targeted-proof.log` / `remaining-targeted-proof.sh` | tbx_01m3w4psn6ztq8aj86qwzycgea | https://github.com/openclaw/openclaw/actions/runs/36892214453 | 0 | 468.672 |

### File proof and measured walls

Before uses the latest successful original measurement when available. Failed originals remain explicit. Fixed smoke predates later source corrections; final clean statistics come only from the final campaign. Exact per-run walls are in the JSON alongside each run's exit and coverage.

| File | Before wall s / exit | Fixed smoke wall s | Clean passes / recorded / 20 | Clean wall min / median / max s | Test counts observed |
| --- | ---: | ---: | ---: | ---: | --- |
| `extensions/browser/chrome-extension/bootstrap.chromium.test.ts` | 93.887 / 0 | 78.513 | 20 / 20 / 20 | 61.348 / 67.038 / 88.556 | Tests  1 passed (1); Test Files  1 passed (1) |
| `extensions/browser/src/browser/chrome-mcp-connect.test.ts` | 39.867 / 0 | 46.652 | 20 / 20 / 20 | 26.353 / 33.686 / 53.135 | Tests  8 passed (8); Test Files  1 passed (1) |
| `extensions/browser/src/browser/extension-relay/relay-coexistence.e2e.test.ts` | 58.429 / 0 | 44.022 | 20 / 20 / 20 | 22.979 / 30.668 / 52.989 | Tests  1 passed (1); Test Files  1 passed (1) |
| `extensions/browser/src/browser/extension-windows-management.test.ts` | 27.235 / 0 | 38.992 | 20 / 20 / 20 | 17.687 / 22.980 / 28.019 | Tests  13 passed (13); Test Files  1 passed (1) |
| `extensions/browser/src/browser/pw-download-cancel.chromium.test.ts` | 36.212 / 0 | 36.637 | 20 / 20 / 20 | 21.392 / 31.005 / 35.897 | Tests  12 passed (12); Test Files  1 passed (1) |
| `extensions/browser/src/browser/pw-download-capture.test.ts` | 3.303 / 0 | 3.086 | 20 / 20 / 20 | 2.205 / 2.556 / 3.262 | Tests  8 passed (8); Test Files  1 passed (1) |
| `extensions/browser/src/browser/pw-tools-core.download-current-document.live.test.ts` | 56.193 / 0 | 55.889 | 20 / 20 / 20 | 32.285 / 43.218 / 68.662 | Tests  5 passed (5); Test Files  1 passed (1) |
| `extensions/browser/src/browser/pw-tools-core.download-current-document.test.ts` | 26.512 / 0 | 27.221 | 20 / 20 / 20 | 25.423 / 35.208 / 50.219 | Tests  16 passed (16); Test Files  1 passed (1) |
| `extensions/codex/src/app-server/run-attempt-one-shot-cleanup.test.ts` | 86.934 / 0 | 82.302 | 20 / 20 / 20 | 59.111 / 75.645 / 129.214 | Tests  9 passed (9); Test Files  1 passed (1) |
| `extensions/codex/src/app-server/run-attempt.skills.native.test.ts` | 67.535 / 0 | 69.682 | 20 / 20 / 20 | 46.392 / 55.562 / 77.969 | Tests  4 passed (4); Test Files  1 passed (1) |
| `extensions/codex/src/app-server/transport-startup.test.ts` | 33.755 / 0 | 43.299 | 20 / 20 / 20 | 32.665 / 40.200 / 52.749 | Tests  4 passed (4); Test Files  1 passed (1) |
| `extensions/codex/src/node-cli-sessions.test.ts` | 50.305 / 0 | 47.578 | 20 / 20 / 20 | 30.206 / 38.478 / 54.609 | Tests  28 passed (28); Test Files  1 passed (1) |
| `extensions/codex/src/node-exec-server.readiness.test.ts` | 26.161 / 0 | 29.024 | 20 / 20 / 20 | 25.102 / 30.852 / 45.288 | Tests  8 passed (8); Test Files  1 passed (1) |
| `extensions/crabbox/src/crabbox-worker-desktop-setup.test.ts` | 5.178 / 0 | 5.732 | 20 / 20 / 20 | 4.536 / 5.845 / 9.165 | Tests  13 passed (13); Test Files  1 passed (1) |
| `extensions/crabbox/src/crabbox-worker-node-enrollment.test.ts` | 41.468 / 1 | 37.721 | 20 / 20 / 20 | 28.461 / 37.511 / 56.835 | Tests  28 passed (28); Test Files  1 passed (1) |
| `extensions/qa-lab/src/gateway-child-lifecycle.test.ts` | 74.889 / 0 | 60.128 | 20 / 20 / 20 | 47.249 / 53.862 / 78.152 | Tests  19 passed (19); Test Files  1 passed (1) |
| `extensions/qa-lab/src/gateway-startup-lease.integration.test.ts` | 58.660 / 0 | 59.370 | 20 / 20 / 20 | 45.873 / 53.695 / 63.123 | Tests  4 passed (4); Test Files  1 passed (1) |
| `extensions/qa-lab/src/lab-server.test.ts` | 33.183 / 0 | 38.059 | 20 / 20 / 20 | 28.489 / 37.630 / 50.996 | Tests  33 passed (33); Test Files  1 passed (1) |
| `extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-cli-stream-error.test.ts` | 26.599 / 0 | 20.747 | 20 / 20 / 20 | 21.829 / 29.992 / 48.839 | Tests  3 passed (3); Test Files  1 passed (1) |
| `extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-cli.test.ts` | 26.307 / 0 | 21.468 | 20 / 20 / 20 | 20.648 / 28.742 / 44.658 | Tests  12 passed (12); Test Files  1 passed (1) |
| `extensions/qa-lab/src/live-transports/matrix/scenarios/scenario-runtime-tool-progress.test.ts` | 4.146 / 0 | 2.488 | 20 / 20 / 20 | 3.064 / 3.700 / 4.544 | Tests  6 passed (6); Test Files  1 passed (1) |
| `extensions/qa-lab/src/mantis/cli-interrupts.process.test.ts` | 3.184 / 0 | 2.181 | 20 / 20 / 20 | 2.413 / 4.114 / 6.675 | Tests  3 passed (3); Test Files  1 passed (1) |
| `extensions/qa-lab/src/mantis/run.runtime.process.test.ts` | 23.279 / 0 | 23.975 | 20 / 20 / 20 | 20.006 / 27.108 / 45.647 | Tests  7 passed (7); Test Files  1 passed (1) |
| `extensions/qa-lab/src/suite-process-lifecycle.test.ts` | 155.900 / 0 | 82.895 | 20 / 20 / 20 | 62.280 / 77.109 / 116.048 | Tests  1 passed (1); Test Files  1 passed (1) |

The first compact campaign recorded 22 original runs: 20 passed and two failed. Bootstrap failed before its target assertion because the compiled native-host entry disappeared during shared dist preparation; its failed 37.541 s attempt is not a valid behavior comparison. Corrected prebuilt preparation produced a passing original bootstrap (93.887 s), plus the two originally missing relay/suite baselines. Crabbox enrollment's original 41.468 s run failed in the truncated-download fixture; the lane corrected that fixture and added the unchanged downloader owner's sibling as direct proof.

The corrected focused capsule passed all 24 fixed smoke runs, but `pnpm tsgo:extensions:test` exited **2** after six callback typing errors. Its overall wrapper exit **0** does not erase that failed check. The lane owner subsequently corrected those types; only the final campaign's explicit typecheck receipt proves the current bytes.

### Actual extension CI owner groups (11)

These are the 11 actual extension CI owner groups, with complete original sibling inventories and CI metadata retained. Ten groups have three clean replays; the browser group remains blocked by its recorded failures. The E2E/live files below are separate targeted config selections, not full CI shards. Each record verifies changed-file execution output and records skips.

| Owner group | Inventory files | Passes / recorded / 3 | Each replay wall s | Test counts observed |
| --- | ---: | ---: | --- | --- |
| `changed-extensions-config-1` | 273 | 1 / 2 / 3 | 81.215, 88.281 | Tests  16 failed \| 3518 passed \| 92 skipped (3626); Tests  3534 passed \| 92 skipped (3626); Test Files  2 failed \| 253 passed \| 13 skipped (268); Test Files  255 passed \| 13 skipped (268) |
| `changed-extensions-config-13` | 23 | 3 / 3 / 3 | 69.225, 69.430, 72.436 | Tests  502 passed (502); Test Files  23 passed (23) |
| `changed-extensions-config-16` | 17 | 3 / 3 / 3 | 23.282, 24.847, 24.565 | Tests  291 passed (291); Test Files  17 passed (17) |
| `changed-extensions-config-17` | 2 | 3 / 3 / 3 | 53.923, 50.828, 58.546 | Tests  2 passed (2); Test Files  2 passed (2) |
| `changed-extensions-config-18` | 80 | 3 / 3 / 3 | 79.067, 97.660, 94.927 | Tests  994 passed (994); Test Files  80 passed (80) |
| `changed-extensions-config-19` | 80 | 3 / 3 / 3 | 53.122, 52.312, 56.606 | Tests  736 passed (736); Test Files  80 passed (80) |
| `changed-extensions-config-28` | 6 | 3 / 3 / 3 | 84.092, 75.378, 66.794 | Tests  102 passed (102); Test Files  6 passed (6) |
| `changed-extensions-config-35` | 6 | 3 / 3 / 3 | 68.195, 64.207, 53.970 | Tests  33 passed (33); Test Files  6 passed (6) |
| `changed-extensions-config-38` | 5 | 3 / 3 / 3 | 41.472, 38.577, 39.899 | Tests  65 passed (65); Test Files  5 passed (5) |
| `changed-extensions-config-39` | 6 | 3 / 3 / 3 | 46.623, 47.729, 50.416 | Tests  47 passed \| 3 skipped (50); Test Files  5 passed \| 1 skipped (6) |
| `changed-extensions-config-41` | 10 | 3 / 3 / 3 | 52.242, 46.675, 44.820 | Tests  298 passed (298); Test Files  10 passed (10) |

### Supplemental targeted config replays (2 selections)

**Routing error corrected:** I manually represented these two file selections as include-file-only groups. The E2E/live configs ignore that inherited include file and replace their include list with full-project globs. The relay invocation therefore selected the full E2E config. Its exact internal stall phase was not visible in the old buffered harness. The lead stopped that owned wrapper before the following broad live group started. This was a proof-routing error; no product source changed. `pretestBuildMode` was no

(truncated)

### Coordinator follow-up (supersedes the lane's boundary and review notes above)

- Rebased onto main (now 3ec3cacb21b9; includes #162674's facade, #162692's browser hook isolation, and #162792's compiled-worker hook timeout change, which conflicted in `pw-tools-core.download-current-document.test.ts` and was resolved keeping both intents); imports moved to `openclaw/plugin-sdk/test-fixtures`. On the final head, locally with a lockfile-matched donor: oxfmt, type-aware lint, base-aware ratchet, the three plugin SDK import lints, extension test boundary (20/20 tests), and the conflicted file 3/3; knip reports no unused exports from this branch.
- Gates on the final head: extension test boundary 10/10, the no-broad-SDK-entry / exported-subpath / extension core-import lints, `pnpm deadcode:full`, OpenGrep, extension tsgo, type-aware lint, oxfmt, base-aware ratchet; 450/450 standalone runs; seven owning extension bundles 3/3 each; positional E2E/live selections 3/3.
- Open: one full browser-bundle replay failed in the untouched `server-context.list-profiles.test.ts` (`ensureChromeMcpAvailable is not a function`) through the same shared-facade pattern. A base-vs-head A/B could not run (Testbox capacity); this PR's CI browser bundle is the next data point, and a base reproduction follows if it recurs.
- Codex autoreview of the rebased branch (P1 threshold): `scoped-clean`.
