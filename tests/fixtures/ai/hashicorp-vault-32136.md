## Problem

Vault reloads its listener certificate on SIGHUP, but it keeps using the client CA pool loaded at startup. After updating `tls_client_ca_file`, clients trusted by the new CA cannot authenticate until the listener is restarted.

## Change

Load the configured client CA pool whenever the TLS configuration is reloaded and publish the new pool through `GetConfigForClient`. The reload validates the CA file before replacing the active pool, so an invalid CA file does not discard the currently working trust roots. The existing certificate reload behavior remains in place.

## Verification

- `GOWORK=off go test ./listenerutil`
- `GOWORK=off go test -race ./listenerutil`
- `GOWORK=off go vet ./listenerutil`
- `git diff --check`

Fixes #32116.
