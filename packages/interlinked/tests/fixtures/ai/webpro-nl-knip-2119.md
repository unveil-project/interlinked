Closes #2114

Vitest resolves its root as `test.root || root || cwd` ([source](https://github.com/vitest-dev/vitest/blob/964e1a4404c31bf8fd37cb05ea0095483b506802/packages/vitest/src/node/plugins/index.ts#L25)), but the plugin's `vitestRoot` only looked at `test.root`. With only a top-level `root: 'lib'`, `test.include`, `setupFiles` and the mocks directory were resolved from the project directory, so knip reported the setup file as unresolved and the tests and their imports as unused files.

`vitestRoot` now falls back to `cfg.root` when `test.root` isn't set. Configs with neither are unchanged (including the `configFileDir` fallback for resolved config files).

## Verification

- New fixture `vitest15` (same config as the issue) + test: fails on `main` (3 unused files, 1 unresolved import), passes with the change
- `node --test test/plugins/vite*.test.ts test/plugins/vitest*.test.ts test/plugins/rstest*.test.ts`: 50/50 pass
- Full `pnpm test`: 1373/1376 pass; the 3 failures (`knip --version`, `knip --reporter sarif`, `fix-tsc: fix-members`) fail the same way on a clean `main` checkout here, so they're unrelated
- `oxlint`, `oxfmt --check` and `tsc --noEmit` pass

This PR was written with Claude Code.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
