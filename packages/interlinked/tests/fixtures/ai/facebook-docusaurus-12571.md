## Pre-flight checklist

- [x] I have read the [Contributing Guidelines on pull requests](https://github.com/facebook/docusaurus/blob/main/CONTRIBUTING.md#pull-requests).
- [ ] **If this is a code change**: I have written unit tests and/or added dogfooding pages to fully verify the new behavior.
- [ ] **If this is a new API or substantial change**: the PR has an accompanying issue (closes #0000) and the maintainers have approved on my working plan.

## Motivation

Upgrade `oxfmt` from `^0.47.0` to `^0.70.0` (AI-assisted). `0.71.0` is excluded by our 7-day `minimumReleaseAge`.

The PR has 3 commits, best reviewed separately:

1. **Dependency + script changes**
2. **Pure reformat** (`pnpm format`, no other changes): only 9 files, all cosmetic (see below)
3. **`.git-blame-ignore-revs`** listing the reformat commit

### Breaking changes from 0.47 to 0.70 that affect us

- **Gitignored targets are skipped** ([oxc#25133](https://github.com/oxc-project/oxc/pull/25133), [oxc#25531](https://github.com/oxc-project/oxc/pull/25531)): directory and glob targets inside a gitignored tree are now skipped. Only explicitly named files are still formatted, and there is no CLI flag to turn this off. This broke 2 things, both failing with exit code 2 ("Expected at least one target file"):
  - the `build` script of the 7 theme/plugin packages: `oxfmt "lib/theme/**/*.js"` (`lib/` is gitignored)
  - `format:website:build`: `oxfmt website/build` (gitignored), used by Argos text snapshots

  Fix: new `admin/scripts/formatGitignoredFiles.js` expands the globs with `fs.promises.glob()` and passes the files to oxfmt explicitly, in batches to stay under the Windows command-line limit. Config resolution and `ignorePatterns` behave the same as before.
- **New native formatters** replace Prettier for JSON (0.53–0.55), CSS/LESS/SCSS (0.57), GraphQL (0.57) and YAML (0.62). They produced no diff on our repo files.
- `.gitignore` is now read from parent directories and `.git/info/exclude` (0.49). `ignorePatterns` containing `..` are rejected (0.59), and we have none.
- No config option was renamed or removed. Both `.oxfmtrc*.json` files work unchanged, and the `--list-different`, `--no-error-on-unmatched-pattern` and `--config` flags still exist.
- `oxfmt --check .` processes the same 1894 files on 0.47 and 0.70, so no new file types are picked up.

### Reformat diff

- 7 MDX docs code blocks: placeholder objects that contain only a comment are collapsed (`{/* options */}`). I checked the `highlight-*` magic comments and they still point at the right lines.
- `codeBlockUtils.tsx`: `for (...; cond; )` becomes `for (...; cond;)`
- `markdownUtils.ts`: a last-argument arrow function now hugs the call
- One TS union type in `docusaurus.config.js.mdx` loses its leading `|`

There are no semantic changes and no JSON key reordering.

### Knock-on effects

- **Swizzle/eject output (this fixes a regression from the Prettier → oxfmt switch in #11824, which is unreleased)**: with 0.47, the `lib/theme/**/*.js` glob didn't match files directly under `lib/theme/`. So `ErrorPageContent.js`, `prism-include-languages.js`, `SearchBar.js` and `Mermaid.js` of `theme-classic` were left as raw `tsc` output (4-space indent, `{ a }`). They are now formatted like in v3.10.2. All other ejected files in the 7 packages are byte-identical to the 0.47 output.
- **Argos text snapshots will show expected diffs that need approval**. I compared the 0.47 and 0.70 output on the same `argos:build:text-snapshots` build:
  - `docs/**/*.html`: no change
  - ~22 `blog/**/*.html` pages: `<template data-dgst=""></template><!--/$-->` is no longer split across 2 lines
  - `styles.css`: 2 lines where the new CSS formatter keeps DocSearch's minified `calc(var(--docsearch-vh, 1vh)*100)` (Prettier added spaces around `*`)
  - `format:website:build` now only formats `.html` and `.css` files, the only file types Argos uploads. It no longer formats the unused JS bundles and `feed.json`.
- **lint-staged pre-commit** still works (tested on this PR's own commits).

### `.git-blame-ignore-revs` and squash merge

This repo only allows squash merging, so the SHA in this PR's `.git-blame-ignore-revs` won't exist on `main`. Recommended approach: **squash-merge, then open a follow-up PR that sets the file to the squash commit SHA.** The squash commit also contains the small dependency change, but ignoring it in blame is harmless. Alternatively, drop the 3rd commit from this PR and add the file in the follow-up.

### Conflicts with other PRs

The reformat touches only 9 files. These open PRs overlap and may need a rebase and `pnpm format`: #12430, #11101 (`docusaurus.config.js.mdx`), #12389 (`markdownUtils.ts`), #12221, #11655 (`codeBlockUtils.tsx`). Any large cleanup PR (fs-extra, lodash, React imports…) should be merged before this one, or rebased afterwards and run `pnpm format`.

## Test Plan

- `pnpm format:diff`: clean
- `pnpm lint` and `pnpm lint:deps` pass
- `pnpm build:packages` passes, and I diffed the ejected `lib/theme` output against 0.47 (see above)
- `pnpm test`: 3163 tests pass, no snapshot changes
- `pnpm build:website:fast` passes
- `pnpm argos:build:text-snapshots && pnpm argos:format:text-snapshots` passes, and I diffed the output against 0.47 (see above)

### Test links

Deploy preview: https://deploy-preview-12571--docusaurus-2.netlify.app/

- https://deploy-preview-12571--docusaurus-2.netlify.app/docs/using-plugins
- https://deploy-preview-12571--docusaurus-2.netlify.app/docs/typescript-support
- https://deploy-preview-12571--docusaurus-2.netlify.app/docs/migration/v3

## Related issues/PRs

- #11824 (migration from Prettier to oxfmt)
- [oxfmt changelog](https://github.com/oxc-project/oxc/blob/main/apps/oxfmt/CHANGELOG.md)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
