### Summary

Validates top-level `auditLevel` and `auditConfig` settings when read from `pnpm-workspace.yaml` (or the global config) even when the `audit` section is omitted. Previously, omitting the `audit` block caused top-level `auditLevel` and `auditConfig` to bypass validation entirely, allowing invalid values to pass through unvalidated.

### Changes

- Validates top-level `auditLevel` against `AUDIT_LEVELS` when `audit` is not specified
- Validates top-level `auditConfig` object structure and `auditConfig.ignoreGhsas` string array
- Added unit test coverage for invalid shapes and accepted configurations in `getOptionsFromRootManifest.test.ts`
- Added changeset declaring patch updates for `@pnpm/config.reader` and `pnpm`

<!-- codesmith:footer -->
---
<a href="https://app.blacksmith.sh/pnpm/codesmith/pnpm/pr/16524?autoLogin=true&ref=codesmith_pr_footer"><picture><source media="(prefers-color-scheme: dark)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-dark-v2.svg"><source media="(prefers-color-scheme: light)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-light-v2.svg"><img alt="View with [code]smith" src="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-dark-v2.svg"></picture></a> <a href="https://backend.blacksmith.sh/track/enable-autofix?expires=1793546628&installation_model_id=426870&pr_number=16524&ref=codesmith_pr_footer&repository=pnpm%2Fpnpm&return_to=https%3A%2F%2Fgithub.com%2Fpnpm%2Fpnpm%2Fpull%2F16524&signature=25808184c3f026db9231cf5655b7fb7c844dbb47ebca77424b5f703c8aa5e3de"><picture><source media="(prefers-color-scheme: dark)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-light.svg"><img alt="Autofix with [code]smith" src="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-dark.svg"></picture></a>
<sup>Need help on this PR? Tag <code>@codesmith-bot</code> with what you need. Autofix is disabled.</sup>

<!-- codesmith:autofix:disabled -->
<!-- /codesmith:footer -->

<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **Bug Fixes**
  * Invalid top-level audit settings in `pnpm-workspace.yaml` now report `INVALID_SETTING`, including when the `audit` section is omitted or only partially configured.
  * Invalid audit levels and malformed audit configuration values are rejected consistently.
  * Valid legacy audit settings continue to be accepted, while values in the `audit` section take precedence when present. This keeps configuration errors visible even when other audit settings are provided.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->
