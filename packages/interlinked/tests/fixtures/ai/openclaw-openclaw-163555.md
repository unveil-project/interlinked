Related: #161977

## What Problem This Solves

Fixes: Doctor and `openclaw update status` call valid systemd directives "unrecognized settings" when they come from an operator drop-in, and print identical lines when two drop-ins set the same directive.

## User Impact

User impact: operators see which drop-in sets each directive and that OpenClaw leaves it unchanged, instead of a warning that reads like invalid systemd configuration.

## Why This Change Was Made

Drop-in findings reused the wording for unknown edits in the managed base unit. They now name their source drop-in and say the setting is preserved. Classification is unchanged: drop-in directives are still reported, still block automatic policy repair, and are never rewritten. Base-unit wording is unchanged.

The issue's PATH half is not changed here: the non-minimal PATH check already exempts expected service PATH entries (covered in `src/daemon/service-audit.test.ts`), which is why this is "Related" rather than "Closes".

## Evidence

### Real behavior proof (head `cc5efb14`, Ubuntu 24.04.4, systemd 255, Node 24.21.0, pnpm 12.5.1)

Real user systemd manager. A unit rendered by the repo's own installer code (`buildGatewayInstallPlan` + `buildSystemdUnit`) installed as a user unit with two operator drop-ins, `operator.conf` (`CPUWeight=1000`) and `zz-operator.conf` (`CPUWeight=500`), then `systemctl --user daemon-reload`. The service was never started or enabled.

```
$ systemctl --user show openclaw-gateway-ocproof.service -p LoadState -p ActiveState -p UnitFileState -p DropInPaths -p CPUWeight
CPUWeight=500
LoadState=loaded
ActiveState=inactive
DropInPaths=~/.config/systemd/user/openclaw-gateway-ocproof.service.d/operator.conf ~/.config/systemd/user/openclaw-gateway-ocproof.service.d/zz-operator.conf
UnitFileState=disabled
```

Before, upstream main `fa95e3c7` (`OpenClaw 2026.9.7 (fa95e3c)`):

```
$ openclaw --profile ocproof update status
...
Warning: Systemd Service.CPUWeight contains an unrecognized setting.
Warning: Systemd Service.CPUWeight contains an unrecognized setting.

$ openclaw --profile ocproof doctor --non-interactive
◇  Gateway service definition ────────────────────────────────────╮
│  - Systemd Service.CPUWeight contains an unrecognized setting.  │
│  - Systemd Service.CPUWeight contains an unrecognized setting.  │
├─────────────────────────────────────────────────────────────────╯
```

After, this PR `cc5efb14` (`OpenClaw 2026.9.7 (cc5efb1)`), same unit and drop-ins:

```
$ openclaw --profile ocproof update status
...
Warning: Systemd Service.CPUWeight is set by operator drop-in ~/.config/systemd/user/openclaw-gateway-ocproof.service.d/operator.conf; not changed.
Warning: Systemd Service.CPUWeight is set by operator drop-in ~/.config/systemd/user/openclaw-gateway-ocproof.service.d/zz-operator.conf; not changed.

$ openclaw --profile ocproof doctor --non-interactive
◇  Gateway service definition ──────────────────────────────────────────────────╮
│  - Systemd Service.CPUWeight is set by operator drop-in                       │
│    ~/.config/systemd/user/openclaw-gateway-ocproof.service.d/operator.conf;   │
│    not changed.                                                               │
│  - Systemd Service.CPUWeight is set by operator drop-in                       │
│    ~/.config/systemd/user/openclaw-gateway-ocproof.service.d/zz-operator.conf;│
│    not changed.                                                               │
├───────────────────────────────────────────────────────────────────────────────╯
```

`update status --json` on both builds reports the same `kind: "unknown-edit"`, the same `reason: "Operator drop-in overrides installer policy."` and a separate `sourcePath` per drop-in; only `message` differs, so automatic policy repair stays blocked. Home path redacted to `~`; the profile name `ocproof` is a throwaway.

### Tests

- New regression in `src/daemon/service-audit.definition-facts.test.ts`: two drop-ins both set `CPUWeight`. Before: two identical `Systemd Service.CPUWeight contains an unrecognized setting.` findings. After: each finding names its drop-in path.
- `pnpm test src/daemon/service-audit.definition-facts.test.ts --maxWorkers=1`: 60/60 passed.
- `pnpm test src/daemon`: 100 files, 2,239 tests passed, 15 skipped.
- `pnpm tsgo:core`, the format check on both changed files, conflict-marker, line-cap, assertion-safety, database-worker and test-timeout ratchets, `config:docs:check`, boundary report, wrapper shadowing and deps pins all pass.
- Known red on main and unrelated: `check:env-var-count` (477 > 476) and 3 tests in `settled-turn-finalization.provider-error.test.ts`.
- The `checks-node-compact-small-2/3` failures on this PR are `test/scripts/pr-wrapper-source-closure.test.ts` and `test/scripts/eager-import-closure.test.ts`, which fail identically on a clean `main` checkout and on every other PR opened in the same hour (#163556, #163557, #163558); this PR does not touch the wrapper inventory.
