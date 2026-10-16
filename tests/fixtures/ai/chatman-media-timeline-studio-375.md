## Problem

`ProjectSchema.version` is a free-form `String` hardcoded to `"1.0.0"` (`crates/ts-schema/src/project.rs`). There is no semver scheme for the schema itself, no migration path, and no documented backward-compatibility guarantee. Compatibility currently relies implicitly on serde defaults for missing fields (additive changes work; nothing else is defined).

The partner integration (postim.life) generates TS types from `timeline emit-schema` (schemars JSON Schema) and builds their product against this contract, so they explicitly need:

1. A pinned, versioned schema artifact (tag/commit) to codegen against.
2. A documented backward-compatibility guarantee (which changes are additive/safe vs breaking).
3. Breaking changes signalled via an explicit schema version bump, not silently.

## Current state (by code)
- `ProjectSchema.version: String` default `"1.0.0"`.
- `contracts.rs`: `CONTRACT_SCHEMA_VERSION = "1.0.0"`.
- `timeline emit-schema` / `emit-example` exist (schemars 0.8) — good basis for codegen.

## Suggested direction
- Adopt semver for ProjectSchema; bump on breaking changes only.
- Publish the `emit-schema` output as a release artifact tagged per version (source of truth for downstream codegen).
- Document the additive-only / breaking-change policy.
- Optional: validate/reject unknown major versions on load.

## Context
Raised in chatman-media × postim.life integration brief (2026-06-26), question 1 (ts-schema stability & versioning).
