## What

ESC's `Never` schema validator returned `false` without recording a diagnostic when a value (or an unevaluated value's static schema) failed to validate against `Never`. Callers that evaluate `fn::open` inputs/state treat a failed validation as non-fatal and simply mark the resulting value `unknown`, so the failure was swallowed with no explanation surfaced to the user.

## Why

This is confusing in practice: an environment that assigns too many elements to a tuple, or otherwise produces a value that can never satisfy a `Never`-typed schema slot, silently ends up `unknown` with no diagnostic telling the user why. Fixes #24909.

## How

- `validateElement` and `validateSchemaType` now call `errorf` and report a `"value is never valid"` diagnostic instead of returning `false` with no diagnostic.
- While doing this, I found and fixed a related latent bug in `validateSchemaType`: comparing a schema against `Never` always failed, even when the schema being compared was *itself* `Never`. Since `Never` is trivially a subtype of itself, this made every optional `Never`-typed property fail self-comparison during `CheckEnvironment` (which validates schemas without concrete values). This was previously invisible because of the silent-failure bug above; fixing the diagnostic reporting surfaced it as a regression in the `schema` golden test, which this PR also fixes.
- Added `eval_validate_test.go` with a focused regression test (`TestValidateNeverReportsDiagnostic`) covering all three paths: a known value against `Never`, an unknown value's schema against `Never`, and a `Never`-schema unknown value against a concrete schema. I confirmed each sub-test fails on the pre-fix code and passes after the fix.
- Regenerated the `schema-error` golden file (`PULUMI_ACCEPT=1`) to include the now-visible diagnostics for the pre-existing tuple-overflow cases in that fixture (assigning a 3-element tuple to a 2-element tuple schema).

## Testing

```
cd sdk/go/common/esc && go test -count=1 ./...
ok  	github.com/pulumi/pulumi/sdk/v3/go/common/esc	2.9s
ok  	github.com/pulumi/pulumi/sdk/v3/go/common/esc/ast	4.9s
ok  	github.com/pulumi/pulumi/sdk/v3/go/common/esc/diags	1.9s
ok  	github.com/pulumi/pulumi/sdk/v3/go/common/esc/eval	11.9s
ok  	github.com/pulumi/pulumi/sdk/v3/go/common/esc/internal/spell	5.7s
ok  	github.com/pulumi/pulumi/sdk/v3/go/common/esc/internal/util	7.5s
ok  	github.com/pulumi/pulumi/sdk/v3/go/common/esc/schema	9.2s
ok  	github.com/pulumi/pulumi/sdk/v3/go/common/esc/syntax	13.5s
ok  	github.com/pulumi/pulumi/sdk/v3/go/common/esc/syntax/encoding	15.9s
```

Also confirmed `cd pkg && go build ./...` still succeeds.

Changelog entry added under `changelog/pending/`.
