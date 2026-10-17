## Summary
Fixes perpetual "Scanning folder for Git repositories..." hang after renderer SIGTERM (code 15) + extension host restart.

Field evidence (macOS Tahoe, VS Code 1.140.0):
- `main.log`: `CodeWindow: renderer process gone (reason: killed, code: 15)`
- `window2/exthost/exthost.log`: `Cannot activate the 'Git' extension because its dependency 'Git 基础' failed to activate` preceded by `Channel has been closed`
- `fileWatcher.log`: repeated `Events were dropped by the FSEvents client` for aggregate workspace
- `state.vscdb`: stale Agent worktree paths (e.g. `omni_panel_t544`) re-probed every scan

## Root causes verified in source
1. **SCM state machine has no failure state**: `extensions/git/package.json` welcome views match `git.state != initialized`; `APIState` is only `uninitialized|initialized`; `Model` constructor does `doInitialScan().finally(() => setState('initialized'))`. Any activation/scan failure leaves deceptive scanning UI forever.
2. **Transient dependency failure permanently cached**: `src/vs/workbench/api/common/extHostExtensionActivator.ts` wraps failed deps in `FailedExtension` in `_operations` with no retry. A transient channel close in `vscode.git-base` during host restart permanently poisons `vscode.git`.
3. **Ghost paths block @sequentialize queue**: `extensions/git/src/model.ts#openRepository` spawns `git rev-parse` for deleted worktree paths with no `fs.stat` fast-path.

Note: the draft snippet in the local bug report used `this._operations.delete` inside `ActivationOperation` (does not compile - map lives on `ExtensionsActivator`). This PR implements the compile-correct version.

## Changes (5 files, +118/-14)
- `extensions/git/src/api/git.d.ts`: `APIState` += `'failed'` (additive, backwards compatible).
- `extensions/git/src/model.ts`: 30s initial-scan timeout (`Promise.race` + `clearTimeout`); constructor `then(success->initialized, failure->failed)`; `isInitialized` resolves on `failed`; `openRepository()` `fs.stat` fast-path skips non-existent/non-directory paths.
- `extensions/git/package.json`: scanning views gated on `git.state == uninitialized`; new `scanFailed` welcome on `git.state == failed`.
- `extensions/git/package.nls.json`: `view.workbench.scm.scanFailed` message with Reload Window action (with Locked command comments per localization rules).
- `src/vs/workbench/api/common/extHostExtensionActivator.ts`: new exported `isTransientActivationError()` (CancellationError or channel/IPC-closed in message or `.detail/.cause` chain); transient dep failures do not cache `FailedExtension` (leave value null + warn); `_handleActivationRequest` drops null/transient cached ops for retry; `_initialize` opens barrier in `finally`.

## Verification
- `python3 -m json.tool` on both JSON files: OK
- `git diff --check`: clean (tabs in TS, 2-space in package.json per .editorconfig)
- `tsc --noEmit --skipLibCheck` sweep: only pre-existing missing `vscode` module errors; no errors in edited hunks
- Isolated logic tests (6/6 PASS): transient classifier (direct/cancellation/detail-wrapped true; genuine missing false), ghost `stat` early-return, timeout race rejection
- Scope kept minimal; no formatting churn; no new Electron APIs; no API removal

## Follow-up / risk
- `failed` is additive; consumers checking `!= initialized` still treat it as not-ready, which is correct.
- 30s timeout value is conservative for 15+ repo aggregate workspaces; adjustable if maintainers prefer config.
- CLA will be signed on PR creation if required.

Fixes field report: `docs/2026-10-02-vscode-git-activation-deadlock-and-scm-hang-bug-report.md`.
