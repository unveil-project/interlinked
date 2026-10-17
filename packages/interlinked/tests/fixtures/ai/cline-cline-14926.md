### Related Issue

**Issue:** #14923

### Description

The CLI TUI decides at startup whether to show onboarding with `isProviderConfigured()` (`apps/cli/src/tui/utils/provider-configured.ts`). It accepts a key passed with `-k` or one saved in `providers.json`, but not a key in the provider's documented environment variable, although the runtime uses exactly that (`apiKeyEnv`, e.g. `OPENROUTER_API_KEY`) when nothing is saved. So `OPENROUTER_API_KEY=… cline` with OpenRouter selected opens "Connect a model provider", and the only ways past it are `-k` (key in argv, then persisted) or saving the key to disk.

This adds `hasProviderApiKeyInEnv(providerId, env)`, which reads the provider's env variable names from the model catalogue (`Llms.MODEL_COLLECTIONS_BY_PROVIDER_ID[id].provider.env`, the same `apiKeyEnv` the runtime resolves), and makes `isProviderConfigured()` return `true` when one of them is set. Nothing is persisted; the provider picker and other flows are unchanged.

Use case: hosts that launch the CLI (we run it in NeuroSquad, a desktop app with several agent CLIs side by side) want to pass the key only through the child's environment.

### Test Procedure

- New `provider-configured.test.ts`: env lookup (set, blank, missing, unknown provider) and `isProviderConfigured()` with and without `OPENROUTER_API_KEY` against the isolated test data dir. Both tests fail without the change.
- `apps/cli`: `tsc --noEmit` clean; biome check clean on the changed files (the two existing `organizeImports` findings in `commands/mcp.ts` and `use-root-keyboard.test.ts` are unchanged); vitest on `src/tui` and `src/utils` (72 files): 496 passed, 5 failed — the same 5 fail on `main` on this Windows machine (status-bar cost formatting, image path in events, Linux `xdg-open` wrapper). A full-suite run stalled in one test file on this Windows machine (not one touched here), so CI is the reference for the rest.
- Live, Windows 10: an isolated `--data-dir` whose `providers.json` selects OpenRouter with a model and a local OpenAI-compatible stand-in as `baseUrl`, no key; `OPENROUTER_API_KEY` set.
  - `cline` 3.0.69 (npm): onboarding screen, no request.
  - this branch (`bun --conditions=development apps/cli/src/index.ts`): the prompt view opens, a prompt reaches the stand-in with `Authorization: Bearer <env key>`, the answer is shown, and `providers.json` still has no key.

### Type of Change

-   [x] 🐛 Bug fix (non-breaking change which fixes an issue)

### Pre-flight Checklist

-   [x] Changes are limited to a single feature, bugfix or chore (split larger changes into separate PRs)
-   [x] Tests are passing (`bun test`) and code is formatted and linted (`bun run format && bun run lint`)
-   [x] I have reviewed [contributor guidelines](https://github.com/cline/cline/blob/main/CONTRIBUTING.md)

### Additional Notes

Written with AI assistance (Claude Code); I reviewed the change and ran the checks above.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
