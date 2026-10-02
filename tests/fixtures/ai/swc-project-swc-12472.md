**Description:**

Preserve all consecutive labels when lowering `for...of`. Previously only the innermost label stayed attached to the generated loop, while outer labels remained on the enclosing `try`. The transform now keeps the entire label chain on the iteration statement, preserving label order, spans, and identifiers across spec, loose, and array lowering. Single-label storage stays inline with `SmallVec`.

Add fixture and runtime regressions for #12433 and labeled `for await...of` from #12430. The async-iteration label handling already exists in #12414; these tests verify ordinary async functions, async arrows, and async generators through standalone passes and the full compiler, including ES5, compression, mangling, and external helpers. Runtime coverage checks labeled break/continue, nested loops, block boundaries, per-iteration closures, and iterator closing.

The Windows compiler execution job exposed a Node command-line limit: the ES5 output with an inline source map exceeded the limit for `node -e` (error 206). The test utility now retries that specific Windows spawn error using stdin, keeping the original source and normalizing user arguments before module dependencies execute. CommonJS and ESM fixtures cover long scripts, argument preservation, and execution errors.

**BREAKING CHANGE:**

None.

**Related issue (if exists):**

Fixes #12433
Fixes #12430

**Tests:**

- `cargo fmt --all`
- `cargo clippy --all --all-targets -- -D warnings`
- `cargo test -p swc_ecma_testing -p swc_ecma_compat_es2015 -p swc_ecma_transforms_compat -p swc --no-fail-fast` — 7,465 passed, 0 failed (201 ignored).
- `cargo test -p swc --test exec` — 457 passed, 0 failed.
- The exact 36,449-byte script from the failing Windows job executed successfully through stdin on Node 20.
- New compatibility and compiler snapshot fixtures generated with `UPDATE=1` and rerun without `UPDATE`.

Submodules were initialized, Node dependencies installed, and the helper package built before testing. Compiler execution tests used `SKIP_HELPERS=1` with the built helpers.
