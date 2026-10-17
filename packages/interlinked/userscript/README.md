# interlinked userscript

Dev tool for trying the detector on real PRs. It is built from the local `src/`, so you're always testing your working copy, never the published package.

```sh
pnpm dev:userscript   # rebuilds userscript/dist/interlinked.user.js on change
```

Install `userscript/dist/interlinked.user.js` in Tampermonkey or Violentmonkey. In Tampermonkey you can point a script at the local file (`// @require file:///…/interlinked.user.js`, with "Allow access to file URLs" on) so rebuilds are picked up on reload.

On any `github.com/<owner>/<repo>/pull/<n>` page, a badge appears in the bottom-right corner. Click it to see which signals fired. The script fetches the raw PR body from the GitHub API and the repo's PR template from `raw.githubusercontent.com`.

Unauthenticated API calls are limited to 60 an hour. Use the "Set GitHub token" menu command to set a token (a fine-grained one with no permissions is enough for public repos).
