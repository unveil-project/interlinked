## Current Behavior

When a workspace package pins a version that conflicts with the hoisted one, npm installs it under the workspace (in the issue's repro: `projects/backend-logging/node_modules/winston-transport@4.4.0`). The pruned graph keeps that version, but no external package depends on it, so `mapSnapshots` gives it no path and then cannot place its dependencies: `Following packages could not be mapped to the NPM lockfile: npm:readable-stream@2.3.8, …`, and `prune-lockfile` falls back to the root lockfile.

## Expected Behavior

Such a version goes under the workspace module that ships with the output (`workspace_modules/<pkg>/node_modules/<name>`), where the root lockfile has it, and its dependencies nest under it. On the issue's repro (nx 23.2.1 with this `npm-parser`), the pruned lockfile now has the same five packages under `workspace_modules/@internal/backend-logging` that the root lockfile has under `projects/backend-logging`.

New spec in `npm-parser.spec.ts`: fails before with the same error, passes after. The rest of the lock-file specs give the same results with and without the change.

`npm ci` on the repro's output then stops at `gaxios@7.1.3`, which ends up under the wrong parent. That happens without this change too, so I left it out of this PR.

#37205 reworks npm placement more broadly and also targets "could not be mapped". On its branch the new spec does not throw, but the output drops `wt@1.0.0` and `rs@1.0.0`, so `lib-a` would resolve `wt@2.0.0`. If #37205 lands first, I'll rebase onto it or close this, whichever you prefer.

## Related Issue(s)

Fixes #37247
