## Description

Fixes #7160.

Replaces the experimental `LoggerConfig.disabled` option with `enabled`,
matching OpenTelemetry specification PR #4823.

Loggers remain enabled by default. Setting `enabled: false` disables the
logger, so `enabled()` returns false and `emit()` drops its records.
The pattern configurator preserves explicit false values and defaults to
true when the option is omitted or no pattern matches.

This is a breaking change to the experimental configuration:
- Replace `disabled: true` with `enabled: false`.
- Replace `disabled: false` with `enabled: true`.

The README and experimental changelog document the change.

## Testing

- SDK Logs suite: 166 tests passed.
- Updated existing disabled-logger tests and added four cases covering
  explicit true, explicit false, an omitted value, and unmatched patterns.
- Monorepo compilation passed for 38 projects.
- SDK Logs ESLint passed.
- `git diff --check` passed.

The unchanged source rejects the new `enabled` option during type checking.
Browser tests, the full monorepo test suite, and remote CI have not been verified.

## AI assistance

Codex assisted with implementation, tests, local verification and
documentation.