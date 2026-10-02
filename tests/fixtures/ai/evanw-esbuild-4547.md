Fixes #4545.

When TypeScript `alwaysStrict` is enabled, propagate strict mode through scopes created during parsing. This prevents nested block functions from being lowered with Annex B function-scoped `var` declarations that can shadow outer bindings.

Add a regression test for the nested block function case. The existing alwaysStrict snapshot for #2537 also updates to reflect the corrected lowering.

Validation:
- `go test ./cmd/... ./internal/... ./pkg/...`
- `go vet ./cmd/... ./internal/... ./pkg/...`
- Reproduced the issue before the fix and confirmed the bundled output runs after the fix.
