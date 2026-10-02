Closes #162547

## What Problem This Solves

Fixes: a direct message that queues behind a live run shows no typing indicator for the whole wait, even though `docs/concepts/queue.md` says typing still fires on enqueue.

## User Impact

User impact: on Telegram and other channels whose turns carry an adoption lifecycle, a message queued behind a busy session keeps showing "typing…" until its own run starts and replies. Typing stops when the queued item finishes, is cancelled, or is dropped from the queue. Messages that do not queue are unchanged.

## Why This Change Was Made

The enqueue path already signals typing when a follow-up queues behind a live run, and the follow-up runner keeps the same typing controller. But the buffered dispatcher that handled the inbound message then returns. Its dispatcher idle callback and its `finally` (`markRunComplete` and `markDispatchIdle` in `src/auto-reply/dispatch.ts`) seal that controller and call the channel's `onIdle`, which closes the channel typing loop for good. So typing starts and stops within the same ~360 ms dispatch the issue's log shows (`message dispatch completed ... duration=363ms`).

Related: #92287 starts typing when a queued turn begins to execute (#92267). This change covers the wait before that, and keeps the controller that run would use from being sealed when the inbound dispatch returns.

This follows the direction in the ClawSweeper review: the queued item owns typing from enqueue to settlement.

- `createReplyDispatcherWithTyping` exposes a new `onTypingHandoff` reply option. After it is called, the dispatcher no longer completes the typing controller. When typing comes only from `typingCallbacks`, their `onIdle` (typing teardown) is deferred, and the queued item's typing cleanup runs `onCleanup` and then that `onIdle` once. The handoff state lives in `src/auto-reply/reply/reply-dispatcher-typing-handoff.ts`.
- A channel that passes its own `onIdle` gets no `onTypingHandoff`, so its whole typing lifecycle is unchanged. That `onIdle` can do more than stop typing: Feishu's (`extensions/feishu/src/reply-dispatcher.ts:1232`, `queueIdleSideEffects`) finalizes streaming delivery and closes the card preview. Deferring it made finalization wait on itself (ClawSweeper revision 3). Running it while the handed-off controller kept ticking let the next tick's `onReplyStart` reopen the closed preview (revision 5). So Feishu does not get typing through the queued wait. Channels that pass only `typingCallbacks`, such as Telegram, do.
- `runReplyAgent`, on the enqueue-behind-a-live-run path, closes typing from the queued item's `turnAdoptionLifecycle.onSettled`. Queue completion calls that for a run that finished, a cancelled item, a cleared queue, and the sources of a collected batch.
- The handoff happens only when the follow-up has an adoption lifecycle and queued typing actually started (`typing.isActive()` after `signalToolStart`). Without a lifecycle nothing would settle the typing. In `message` typing mode typing does not start before text, so the controller's `cleanup` never calls `onCleanup` and a deferred `onIdle` would never run. Both cases keep today's behavior. That keeps a dropped item from leaving a typing loop running forever.
- The dispatcher exposes `onTypingHandoff` only when the channel supplied a cleanup callback, because the deferred `onIdle` runs from that callback.
- Each queued `FollowupRun` now carries the typing controller of the dispatch that queued it (`typing`), and the follow-up runner completes that one (`queued.typing ?? defaults.typing`). The queue keeps only the latest runner per key, so before this an earlier queued message, when it finished, completed the later message's controller and sealed it before that message's own turn (ClawSweeper revision 6).

`waitForReplyDispatcherIdle` moved unchanged to `src/auto-reply/reply/reply-dispatcher-idle.ts`, and the two queued-typing cases moved to `agent-runner.runreplyagent.queued-typing.cases.ts`, so the line-cap ratchet holds for `reply-dispatcher.ts` and the runner e2e file.

## Evidence

- New `src/auto-reply/reply/reply-utils.test.ts` case drives a real `createReplyDispatcherWithTyping`, `createTypingController`, and `createTypingCallbacks` (channel TTL off, as on Telegram) through handoff, dispatcher idle, `markRunComplete`, and `markDispatchIdle`. On the test commit the channel `start` runs 0 times in the next 60 s. On the fix it runs 30 times, `stop` is not called during the wait, and `stop` runs once after the queued run settles.
- New `agent-runner.runreplyagent.queued-typing.cases.ts` case: a follow-up with a lifecycle queued behind a live run calls `onTypingHandoff` once and keeps typing open, and `completeFollowupRunLifecycle` on the queued item cleans typing up once. On the test commit `onTypingHandoff` is called 0 times.
- Channel with its own idle (ClawSweeper revisions 3 and 5, fixed in d05596f6c33). The `reply-utils.test.ts` case with distinct `onReplyStart`, `onIdle`, and `onCleanup` callbacks uses fake timers: it calls the handoff option if offered, completes the run and the dispatcher, then advances 5 s. On 3df210b5e18 it fails: the controller never cleans up (`["idle"]` instead of `["cleanup", "idle"]`) and keeps calling `onReplyStart`, which is the call that reopens a Feishu preview. On d05596f6c33 it passes: cleanup and `onIdle` run once at dispatcher idle, and `onReplyStart` is not called again. It replaces the case that raced finalization against a real 50 ms timer.
- Message typing mode. New `queued-typing.cases.ts` case: a follow-up queued behind a live run in `message` mode never starts typing, so it must not take over idle. On 44ae38eaecc `onTypingHandoff` is called once. On 9f8b0d851e4 it is called 0 times. The existing handoff case now marks the mock controller active when its typing loop starts, as the real controller does.
- Two messages queued behind one live run (ClawSweeper revision 6, fixed in 2b73472f754). New `followup-runner.test.ts` case runs a queued item that carries its own controller through a runner whose default controller belongs to a later message. On d05596f6c33 it fails: the item's own `markRunComplete` runs 0 times and the later message's controller is completed instead. On 2b73472f754 it passes: the item's own controller is completed once and the later one is untouched. The queued-typing handoff case now also checks that the enqueued run carries the dispatch's controller.
- On 2b73472f754: `followup-runner` 30/30, `src/auto-reply/reply/queue` 75/75, `agent-runner.runreplyagent.e2e.test.ts` 226/226 with the e2e config, `dispatch-from-config.delivery.test.ts` 294/294, `extensions/feishu/src/reply-dispatcher.test.ts` 79/79, `pnpm tsgo:core` and `pnpm tsgo:core:test` pass.
- On d05596f6c33: `reply-utils` and `reply-flow` 74/74, `extensions/feishu/src/reply-dispatcher.test.ts` 79/79, `pnpm tsgo:core` and `pnpm tsgo:core:test` exit 0, `oxlint` and `oxfmt --check` on the changed files clean. `agent-runner.runreplyagent.e2e.test.ts` (226/226 on 3df210b5e18) was not rerun: this commit does not touch the runner, and its queued-typing cases pass a mock `onTypingHandoff`.
- CI on d05596f6c33: `checks-node-changed-1` failed in `src/agents/model-fallback.reply-entry.e2e.test.ts` and `checks-node-changed-5` in `dispatch-from-config.delivery.test.ts` ("delivers deferred Telegram text when generation fails after a block"). Both assert the old error copy ("API rate limit reached", "Authentication failed", "Something went wrong") that main changed in d0b48d63efb (#163381) after this branch's base. CI's merge ref picked up the new copy. Main updated the delivery test in 08eb496e2c6. The model-fallback e2e on main still expects the old strings. On this branch's base the delivery file passes locally (294/294) and the model-fallback e2e passed 10/10 in an earlier pass. This PR does not touch the error copy.
- Earlier, on 9f8b0d851e4: rebased onto upstream/main 836087a89a4 (green CI); `src/agents/model-fallback.reply-entry.e2e.test.ts`, red in an earlier CI run and on main at that time, passed 10/10 locally.

### Test cost

Measured on an Apple Silicon laptop.

- `pnpm test src/auto-reply/reply/reply-utils.test.ts --maxWorkers=1`: 5.65 s wall, 52 tests, vitest duration 4.16 s (warm).
- The 5 touched unit files together through `node scripts/run-vitest.mjs`: 7.8 s wall warm, 17.8 s after a source edit.
- `agent-runner.runreplyagent.e2e.test.ts` with the e2e config and `--maxWorkers=1`: 686 s wall for the whole 226-test file on this host (vitest duration 685 s, 97% in tests). This PR does not change that cost: its three queued-typing cases take 1 ms each, and the file's slowest existing cases take 2.1 to 3.7 s each. CI seconds are not in yet.

### Live Telegram proof

Not run. The agent has no access to the Convex credential broker that the `telegram-e2e-userbot` skill leases Test Server credentials from, so it could not drive a Test Server DM or capture screenshots. The visible typing state is covered by the channel-callback tests above, not by a real chat. A maintainer with broker access can run the userbot flow: send a DM while a run is active, check that "typing…" stays visible through the wait, and check that it stops after the queued reply.

## AI disclosure

An AI agent (Claude Code) traced the defect, wrote the failing tests and then the fix, and ran the checks listed above: `node scripts/run-vitest.mjs` on the new and touched-area tests on the test commit and on the fix, `pnpm exec vitest run -c test/vitest/vitest.e2e.config.ts` on the runner e2e file, and `node scripts/check-changed.mjs --base upstream/main`. For each ClawSweeper idle finding it wrote the regression first, saw it fail (on 44ae38eaecc, then on 9f8b0d851e4), and then made the fix. For the revision 5 preview finding it wrote the fake-timer regression first and saw it fail on 3df210b5e18. For the revision 6 finding it wrote the `followup-runner.test.ts` regression first and saw it fail on d05596f6c33. It did not run a live Telegram check.

---
<!-- oss-agent -->
<sub>🤖 Written and posted by an AI agent (Claude Code) on behalf of @jayzhou2309.</sub>
