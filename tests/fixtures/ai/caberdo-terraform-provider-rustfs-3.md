Part of #2.

## Goal
Align the build tooling with `terraform-provider-gravitino`.

## Context
- rustfs uses a flat `provider/` package and a **separate** `tools/` Go module (`copywrite` + `terraform-plugin-docs 0.24.0`).
- gravitino has no `tools/` module; `terraform-plugin-docs v0.25.0` is a direct dependency and docs are generated via `//go:generate` in `main.go`.
- GNUmakefile targets differ (gravitino builds to `bin/`, tests `./internal/...`, `lint --config .github/golangci.yml`).

## Scope
1. `GNUmakefile`: adopt gravitino targets — `build` (-> `bin/$(BINARY_NAME)`), `test` (`./internal/...`), `testacc`, `testacc-docker`, `testacc-live`, `lint`/`lint-fix` (`--config .github/golangci.yml`), `fmt`, `vet`, `install`, `generate`, `validate-examples`. Keep `default: build`.
2. `go.mod`: add `github.com/hashicorp/terraform-plugin-docs v0.25.0` as a direct dependency; run `go mod tidy`.
3. Delete the separate `tools/` module (`tools/go.mod`, `tools/go.sum`) and the `copywrite` dependency.
4. `main.go`: add `//go:generate go run github.com/hashicorp/terraform-plugin-docs/cmd/tfplugindocs` and keep the goreleaser `-X main.version` ldflag working.
5. Align the Go version with gravitino (decision D4).

## Acceptance criteria
- `make build`, `make test`, `make generate` all succeed.
- No `tools/go.mod`; `go mod tidy` leaves the tree clean.
- `main.go` carries the `//go:generate` directive.

## Verification
```
go build ./...
go mod tidy && git diff --exit-code go.mod go.sum
make generate
```
(If `./internal/...` does not exist yet, use `./...` until the code-layout issues land.)

## Coordination
Removing the `tools/` module overlaps with the goreleaser config issue (#5) — mention the change there before merging.
