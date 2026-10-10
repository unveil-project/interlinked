close #6728

## Why

Calling `createApp().mount()` inside a scheduler job runs the remaining queued `flush: 'pre'` jobs nested inside that job. In #6728, two pre watchers on the same source each mount an app, and the second watcher runs in the middle of the first watcher's callback. With the issue's shape, the order is `[1, 1, 2, 2]` instead of `[1, 2, 1, 2]`.

The root `render()` calls `flushPreFlushCbs()` after every mount, so pre watchers triggered during a tree's own setup run before its `mounted` hooks (#5721). With no instance, that call flushes every queued pre job after `flushIndex`, including other components' jobs that the running flush would reach next anyway.

## Scope

- `render()` in `packages/runtime-core/src/renderer.ts`: on a mount while the scheduler is flushing, flush only the new tree's pre jobs. Other jobs stay in the queue and run in order after the current job. Mounts outside a flush and the unmount path (#14221) are unchanged.
- `flushPreFlushCbs()` in `packages/runtime-core/src/scheduler.ts`: new `includeSubtree` flag that matches jobs whose id is at least `instance.uid`. Components created during a synchronous mount get uids at or above the root's, so this selects the new tree. New `isSchedulerFlushing()` helper.
- Test in `apiCreateApp.spec.ts`: a pre watcher mounts an app whose setup triggers its own pre watcher. The test asserts the nested watcher runs before the nested `mounted`, and the sibling pre watcher runs after the first callback returns.

## Tradeoffs

Skipping the pre-flush entirely during a flush is a smaller diff, but it moves a nested app's own pre watchers after its `mounted` hooks and breaks the #5721 ordering for apps mounted mid-flush. Filtering by the root uid alone would miss pre watchers in the root's descendants.

## Verification

- The new test fails on `main` (`watcher 2` runs between `watcher 1 start` and `watcher 1 end`) and passes with the fix.
- `vitest --project 'unit*'`: 182 files, 3760 passed, 6 skipped.
- `pnpm check`, eslint, and prettier are clean on the changed files.

## AI disclosure

An AI agent (Claude Code) found this issue, reproduced it with a failing vitest test on `main`, traced the root cause, wrote the fix and test, and ran the checks above (`pnpm vitest run --project 'unit*'`, `pnpm check`, `pnpm eslint`, `pnpm prettier --check`). A second model reviewed the diff and found the #5721 regression in a first draft, which led to the subtree filter.
---
<!-- oss-agent -->
<sub>🤖 Written and posted by an AI agent (Claude Code) on behalf of @jayzhou2309.</sub>


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **Bug Fixes**
  * Corrected the order of pre-flush watchers and mounted hooks when a nested app is mounted during a watcher callback. The nested app’s watcher and mounted hook now run before that callback finishes, while sibling watchers run afterward.
  * Corrected watcher and mounted-hook ordering when a fragment is rendered during a watcher callback, so child lifecycle activity completes before the callback ends and sibling watchers run.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->