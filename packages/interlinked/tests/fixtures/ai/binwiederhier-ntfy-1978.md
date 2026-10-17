Closes #1903.

Add an optional `include` key to the existing YAML configuration loader so deployment-specific overrides can live outside the packaged server.yml.

`include` accepts one path or an ordered list. Paths are relative to the containing file, included values override that file, and later files take precedence. Nested includes are supported; missing files, malformed values, and include cycles fail loading. CLI and environment overrides keep their existing precedence. No file watching or new configuration endpoint is introduced.

Tests cover nested relative files, order and alias handling, invalid includes, cycles, and CLI/environment precedence. Documentation includes the merge rules and a deployment example.

Validation (Go 1.27.1, Linux):
- `go test ./...` passed using the default local test configuration.
- `make fmt-check vet lint staticcheck template-check go-check` passed.
- The upstream workflow's PostgreSQL and optional S3 integration configuration remains for remote CI; local results do not replace those checks.


### Additional CI verification

Both unchanged upstream workflows passed on this PR head in the fork: [test, PostgreSQL tests and coverage](https://github.com/beemines/ntfy/actions/runs/36965244332), [full build](https://github.com/beemines/ntfy/actions/runs/36965244309). Upstream execution still awaits maintainer approval; these runs do not replace that approval.
