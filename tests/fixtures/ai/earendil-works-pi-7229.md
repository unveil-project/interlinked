### What happened?

After the repository was renamed from `earendil-works/pi-mono` to `earendil-works/pi`, several non-CHANGELOG files still use the old `pi-mono/issues` URL pattern. Those issue links return 404 because GitHub does not redirect issue paths when a repository is renamed.

Verified dead links (404):
- `packages/ai/test/tool-call-id-normalization.test.ts` → `https://github.com/earendil-works/pi-mono/issues/1022`
- `packages/coding-agent/test/suite/regressions/2791-fswatch-error-crash.test.ts` → `https://github.com/earendil-works/pi-mono/issues/2791`
- `packages/coding-agent/test/suite/regressions/3302-find-path-glob.test.ts` → `https://github.com/earendil-works/pi-mono/issues/3302`
- `packages/coding-agent/test/suite/regressions/3303-find-nested-gitignore.test.ts` → `https://github.com/earendil-works/pi-mono/issues/3303`
- `packages/coding-agent/src/migrations.ts` → `https://github.com/earendil-works/pi-mono/issues/320`
- `.pi/prompts/cl.md` → `https://github.com/earendil-works/pi-mono/issues/123`
- `AGENTS.md` → `https://github.com/earendil-works/pi-mono/issues/123` (documentation example)

All corresponding `earendil-works/pi/issues/<number>` paths return 200.

### Steps to reproduce

1. Run `grep -R 'earendil-works/pi-mono/issues' --include='*.md' --include='*.ts' --include='*.js'` outside of `CHANGELOG.md` files.
2. Click any matched `pi-mono/issues/*` link.
3. Link returns 404.

### Expected behavior

Issue references in source comments, regression test headers, prompts, and project documentation point at the current `earendil-works/pi` URLs.

I have a branch ready with the replacements (excluding released `CHANGELOG.md` sections, which AGENTS.md marks as immutable). I will open a PR after `lgtm`.
