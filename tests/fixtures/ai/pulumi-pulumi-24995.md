## Summary

When a provider rejects an input, the engine prints the input value in the diagnostic, and secrets inside it come out in plaintext. In #19465 an extra field on a `command:remote:Command` connection printed the private key, so anyone who can add a field to a program can make `pulumi preview` in CI print secrets.

This renders those values with `RedactSecrets()` in the two places that print them: `issueCheckFailures` (Check failures, including the `pulumi import` warning) and `errorToMessage` (`InputPropertiesError` details from Construct and Call). With `--show-secrets` the output is unchanged, the same approach #24567 took for plan violation messages. The resource monitor gets the flag through a new `ShowSecrets` field on `EvalSourceOptions`. Marshalling is untouched, as Frassle suggested when closing #19466, and so is verbose logging.

Fixes #19465

## Test plan

- [x] Added appropriate unit tests - For all changes
- [x] Added a test in `pkg/engine/lifecycletest` - For all engine/protocol changes
- [ ] Added a conformance test in `pkg/testing/pulumi-test-language` - For language protocol changes
- [ ] Added a golden test in `pkg/backend/display` - For changes to the output renderers

`TestInvalidInputDiagnosticsRedactSecrets` covers Check and Construct with and without `ShowSecrets`, `TestImportCheckFailureRedactsSecrets` covers the import warning, and `TestValidationFailures` gets a secret property. The redacted cases fail on master.

```
$ cd pkg && go test -count=1 -tags all ./engine/lifecycletest/ -run 'TestInvalidInputDiagnosticsRedactSecrets|TestImportCheckFailureRedactsSecrets' -v
--- PASS: TestImportCheckFailureRedactsSecrets (0.00s)
    --- PASS: TestImportCheckFailureRedactsSecrets/redacted (0.00s)
    --- PASS: TestImportCheckFailureRedactsSecrets/with_ShowSecrets (0.00s)
--- PASS: TestInvalidInputDiagnosticsRedactSecrets (0.00s)
    --- PASS: TestInvalidInputDiagnosticsRedactSecrets/check_with_--show-secrets (0.00s)
    --- PASS: TestInvalidInputDiagnosticsRedactSecrets/check_redacted (0.00s)
    --- PASS: TestInvalidInputDiagnosticsRedactSecrets/construct_redacted (0.00s)
    --- PASS: TestInvalidInputDiagnosticsRedactSecrets/construct_with_--show-secrets (0.00s)
ok  	github.com/pulumi/pulumi/pkg/v3/engine/lifecycletest

$ go test -count=1 -tags all ./resource/deploy/ -run TestValidationFailures -v
--- PASS: TestValidationFailures (0.00s)
ok  	github.com/pulumi/pulumi/pkg/v3/resource/deploy

# same lifecycle tests on master
--- FAIL: TestImportCheckFailureRedactsSecrets (0.00s)
    --- FAIL: TestImportCheckFailureRedactsSecrets/redacted (0.00s)
--- FAIL: TestInvalidInputDiagnosticsRedactSecrets (0.00s)
    --- FAIL: TestInvalidInputDiagnosticsRedactSecrets/check_redacted (0.00s)
    --- FAIL: TestInvalidInputDiagnosticsRedactSecrets/construct_redacted (0.01s)
FAIL	github.com/pulumi/pulumi/pkg/v3/engine/lifecycletest
```

I also built the CLI from master and from this branch and ran a Go program that registers a `command:remote:Command` (command v1.2.1) with an extra field in `connection`:

```
# master
error: command:remote:Command resource 'test-leak': property connection value {map[extraField:{something} host:{192.0.2.10} privateKey:{&{{testKey}}}]} has a problem: An error occurred decoding 'CommandInputs.connection': 1 failures decoding:
# this branch
error: command:remote:Command resource 'test-leak': property connection value {map[extraField:{something} host:{192.0.2.10} privateKey:{[secret]}]} has a problem: An error occurred decoding 'CommandInputs.connection': 1 failures decoding:
# this branch, --show-secrets
error: command:remote:Command resource 'test-leak': property connection value {map[extraField:{something} host:{192.0.2.10} privateKey:{&{{testKey}}}]} has a problem: An error occurred decoding 'CommandInputs.connection': 1 failures decoding:
```

## Validation

- [x] `make lint` — clean
- [x] `make test_fast` — all pass
- [x] `make tidy_fix` — clean
- [x] `make format` — clean
- [ ] Relevant SDK tests pass (if SDK changes)
- [ ] `make check_proto` — clean (if proto changes)

## Changelog

- [x] Changelog entry added. If you do not believe this PR requires a changelog, ask a maintainer to apply
  the `impact/no-changelog-required` label.

## Risk

Only the text of these diagnostics changes: secret values print as `[secret]` unless `--show-secrets` is set, and event types and fields are unchanged. `pulumi import` has no `--show-secrets` flag, so its check failure warnings are now always redacted. A provider can still put a value into its own failure reason, which the engine cannot redact.
