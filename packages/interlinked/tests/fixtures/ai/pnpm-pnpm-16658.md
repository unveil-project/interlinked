## Summary

Changing a ranged override no longer fails when an old lockfile locks a dependency to an npm alias of another package through an optional peer. Closes pnpm/pnpm#16654

| Issue repro (`--lockfile-only`) | main | this PR |
| --- | --- | --- |
| v12 (`pnpm/`) | `ERR_PNPM_NO_MATCHING_VERSION` for `ajv@8.18.3` | same lockfile as a fresh resolve |
| v11 (`pnpm11/`) | `ERR_PNPM_NO_MATCHING_VERSION` for `ajv@8.18.3` | same lockfile as a fresh resolve |
| new tests, fix reverted | fail with the same error | pass |

- A plain range now requires the locked package to have the alias's name; git and tarball specifiers are unchanged.
- npm lets `ajv-formats` use the hoisted `ajv` alias; pnpm has resolved it as its own dependency since pnpm/pnpm#15503, and this matches that.

## Squash Commit Body

```text
Lockfiles written before pnpm/pnpm#15503 record an optional peer that the
package also depends on as the peer's provider. When that provider is an
npm alias of another package, the snapshot keeps it, for example
`ajv-formats@3.0.1(@redocly/ajv@8.18.3)` with
`optionalDependencies: { ajv: '@redocly/ajv@8.18.3' }`.

Since pnpm/pnpm#15503 the name is resolved as a regular dependency again,
from its plain range (`ajv: ^8.0.0`). The check that decides whether the
locked ref still satisfies that range compared only the version, so the
alias was accepted. The resolver then either kept the other package under
the alias or, when it looks the locked version up in the registry as the
default minimumReleaseAge makes it do, asked for `ajv@8.18.3` and failed
with ERR_PNPM_NO_MATCHING_VERSION. Overrides with a version range in the
selector reach this path because they skip the fast override rewrite.

A plain range now requires the locked package to have the alias's own
name, in both the TypeScript resolver (getRangeOfLockedPackage) and the
Rust resolver (prior_child_key). Non-range specifiers such as git and
tarball URLs keep their existing handling.

Closes pnpm/pnpm#16654
```

## Checklist

- [x] I checked the referenced issue and verified that none of the PRs
  already linked to it solves it.
- [x] New features are implemented only in the Rust pnpm v12 CLI. Bug fixes
  are implemented in every affected version.
- [x] Added a changeset (`pnpm changeset`) if this PR changes any published
  package. Keep it short and written for pnpm users — it becomes a release note.
- [x] Added or updated tests.

---
Written by an agent (Claude Code, claude-opus-5-5).

<!-- codesmith:footer -->
---
<a href="https://app.blacksmith.sh/pnpm/codesmith/pnpm/pr/16658?autoLogin=true&ref=codesmith_pr_footer"><picture><source media="(prefers-color-scheme: dark)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-dark-v2.svg"><source media="(prefers-color-scheme: light)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-light-v2.svg"><img alt="View with [code]smith" src="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-dark-v2.svg"></picture></a> <a href="https://backend.blacksmith.sh/track/enable-autofix?expires=1793888926&installation_model_id=426870&pr_number=16658&ref=codesmith_pr_footer&repository=pnpm%2Fpnpm&return_to=https%3A%2F%2Fgithub.com%2Fpnpm%2Fpnpm%2Fpull%2F16658&signature=162771646138f622cc26dda161d354823e545defa9a1ad81f96b1983e06aa0cd"><picture><source media="(prefers-color-scheme: dark)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-light.svg"><img alt="Autofix with [code]smith" src="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-dark.svg"></picture></a>
<sup>Need help on this PR? Tag <code>@codesmith-bot</code> with what you need. Autofix is disabled.</sup>

<!-- codesmith:autofix:disabled -->
<!-- /codesmith:footer -->

<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Bug Fixes**
  * Fixed installs failing with `ERR_PNPM_NO_MATCHING_VERSION` after an override changes when an optional peer dependency is resolved through an npm alias.
  * Lockfile-only installs now correctly re-resolve aliased optional peer dependencies when overrides change, instead of reusing a lockfile entry for a different package name.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->