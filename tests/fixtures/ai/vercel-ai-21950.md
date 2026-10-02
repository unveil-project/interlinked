## Background

1. Regional endpoint prefixes (such as `au.gemini-3.5-flash`, `eu.gemini-3.5-flash`, and `us.gemini-3.1-pro`) were not matched by `/(^|\/)gemini-/i` in `getGoogleModelCapabilities`, causing `usesGemini3Features` to evaluate to `false` and routing Gemini 3+ models to the Gemini 2.5 `thinkingBudget` configuration instead of `thinkingLevel`.
2. `getMinimumThinkingLevelForGemini3Model` only checked for `gemini-X.Y-flash` and defaulted to `minimal` whenever `versionMatch == null`. Because Gemini 3+ Pro models (`gemini-3.5-pro`, `gemini-3.1-pro`, `gemini-3.1-pro-preview`, `gemini-3-pro-preview`) do not support `thinkingLevel: minimal` (minimum supported level is `low`), passing `reasoning: none` or `minimal` resulted in an HTTP 400 `INVALID_ARGUMENT` error from the Gemini API.
3. Merging `resolvedThinking` with `providerOptions.google.thinkingConfig` could leave both `thinkingLevel` and `thinkingBudget` defined simultaneously when a Gemini 3 model had top-level `reasoning` set alongside `providerOptions.google.thinkingConfig.thinkingBudget` (or vice versa).

## Summary

- Updated Gemini capability and version regexes in `packages/google/src/google-model-capabilities.ts` and `packages/google/src/google-language-model.ts` from `/(^|\/).../i` to `/(^|[/.]).../i` so regional endpoint prefixes (`au.`, `eu.`, `us.`) are properly recognized.
- Updated `getMinimumThinkingLevelForGemini3Model` in `packages/google/src/google-language-model.ts` to strip regional dot prefixes and return `low` for all Gemini 3+ Pro models (`/^gemini-(?:\d+(?:\.\d+)?-)?pro(?:$|-)/`).
- Cleared `thinkingLevel` when `providerOptions.google.thinkingConfig.thinkingBudget` is explicitly provided (and vice versa) so both fields are never sent simultaneously.
- Added unit tests in `google-model-capabilities.test.ts` and `google-language-model.test.ts` covering `gemini-3.5-flash`, `au.gemini-3.5-flash`, `eu.gemini-3.5-flash`, `gemini-3.5-pro`, `gemini-3.1-pro`, `us.gemini-3.1-pro`, and `providerOptions.google.thinkingConfig` override precedence.
- Added a patch changeset for `@ai-sdk/google` and `@ai-sdk/google-vertex`.

## End-to-End Verification

Verified generated `generationConfig.thinkingConfig` payloads across `@ai-sdk/google` and `@ai-sdk/google-vertex` for `gemini-3.5-flash`, `au.gemini-3.5-flash`, `gemini-3.5-pro`, `gemini-3.1-pro`, and `gemini-2.5-pro` with `reasoning: none`, `minimal`, `low`, `medium`, `high`, and `providerOptions.google.thinkingConfig` overrides.

## Checklist

- [x] All commits are signed (PRs with unsigned commits cannot be merged)
- [x] Tests have been added / updated (for bug fixes / features)
- [ ] Documentation has been added / updated (for bug fixes / features)
- [x] A _patch_ changeset for relevant packages has been added (for bug fixes / features - run `pnpm changeset` in the project root)
- [x] I have reviewed this pull request (self-review)
