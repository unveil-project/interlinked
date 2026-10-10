## Description

Adds the missing Turkish translations for the AFFiNE AI chat panel, including canvas and live-editor status messages, scopes, tool-group summaries, and the local-workspace attachment notice.

This is a translation-only change in `packages/frontend/i18n/src/resources/tr.json` and keeps all English interpolation placeholders unchanged.

## Checklist

- [ ] I have signed the AFFiNE Contributor License Agreement.
- [x] The PR targets the `canary` branch and the title follows Conventional Commits.
- [x] Tests and validation are completed where applicable.
- [x] The change is limited to the Turkish locale.

## Validation

- Parsed both `en.json` and `tr.json` successfully.
- Confirmed all 38 `com.affine.ai.chat-panel` keys have Turkish values.
- Confirmed interpolation placeholders match English.
- `git diff --check` passed.

<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Localization**
  * Added Turkish translations for AI chat activity, context scopes, tool execution statuses, item counts, and unavailable views.
  * Added a message explaining attachment and reference limitations in local workspaces.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->