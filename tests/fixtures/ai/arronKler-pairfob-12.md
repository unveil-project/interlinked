Raised in #10.

## What happens

`pairfob service install` rebuilds the launchd or systemd unit from the current shell's environment (`serviceRuntimeEnvironment` in `cmd/pairfob/service_runtime.go`). It persists a fixed list of runtime variables, and only the ones set in the calling shell. The existing unit is overwritten without being read first (`installUserServiceLayout` in `cmd/pairfob/service.go`).

So a variable set at the original install, such as `HERDR_SOCKET_PATH`, `PAIRFOB_STATE_DIR`, `PAIRFOB_MULTI_SESSION` or `PAIRFOB_HERDR_AUTOSTART`, disappears if it isn't exported again. Nothing is printed.

The one-line installer runs `pairfob service install` too, so re-running it has the same effect. `pairfob update` doesn't rewrite the unit and isn't affected.

## What should stay

Building the unit from the environment that was just checked is deliberate: the service should run with the setup that `setup` and `doctor` verified. Old values shouldn't come back silently either. The problem is only that the drop is silent.

## Proposal

1. Before overwriting, read the persisted runtime variables from the existing unit.
2. For each one that is missing or different in the new unit, print its name, the old value and the new value (or "removed"), plus how to keep it.
3. Leave automatic carry-over as an open question. It would hide the same mismatch in the other direction.

The persisted list never includes credentials, so printing the values is safe.

## Acceptance

- Tests for both launchd and systemd units: a removed variable is reported, a changed one is reported, an unchanged one isn't, and a first install prints nothing.
- Which variables get persisted stays out of scope.
