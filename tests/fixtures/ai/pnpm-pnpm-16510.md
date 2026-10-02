<!-- A maintainer will only start reviewing once CodeRabbit has approved and
CI is green. Please wait for those to pass before expecting human review. -->

## Summary

Fixes https://github.com/pnpm/pnpm/issues/16508

Rust's std file locks are stubs on Android: `File::lock_shared` always fails with `ErrorKind::Unsupported` ("lock_shared() not supported"). The store operation lock added in 12.6.0 is taken by every install, so `pnpm install` on Termux aborts before doing any work.

The lock is advisory. It only keeps `pnpm store prune` from racing with installs. When the platform cannot take file locks at all, pnpm now logs a warning and runs without the guard instead of failing. That matches 12.5.1 behavior, which had no lock. `ENOSYS`/`EOPNOTSUPP` from real syscalls map to the same `ErrorKind`, so filesystems without locking get the same fallback.

## Squash Commit Body

```text
fix(store-dir): run unguarded where file locks are not supported

Closes pnpm/pnpm#16508.

std's File::lock/File::lock_shared are unsupported stubs on Android, so
taking the store operation lock failed every install on Termux with
ERR_PNPM_STORE_DIR_ACQUIRE_OPERATION_LOCK. The lock only guards
`pnpm store prune` against racing installs, so when locking reports
ErrorKind::Unsupported the command now warns and proceeds without the
guard instead of aborting.
```

## Checklist

- [x] I checked the referenced issue and verified that none of the PRs
already linked to it solves it.
- [x] New features are implemented only in the Rust pnpm v12 CLI. Bug fixes
are implemented in every affected version. (v12-only code; v11 has no store operation lock.)
- [x] Added a changeset (`pnpm changeset`) if this PR changes any published
package. Keep it short and written for pnpm users — it becomes a release note.
- [x] Added or updated tests.
- [ ] Updated the documentation if needed. (No user-facing setting changed.)

<!-- codesmith:footer -->
---
<a href="https://app.blacksmith.sh/pnpm/codesmith/pnpm/pr/16510?autoLogin=true&ref=codesmith_pr_footer"><picture><source media="(prefers-color-scheme: dark)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-dark-v2.svg"><source media="(prefers-color-scheme: light)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-light-v2.svg"><img alt="View with [code]smith" src="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-dark-v2.svg"></picture></a> <a href="https://backend.blacksmith.sh/track/enable-autofix?expires=1793494435&installation_model_id=426870&pr_number=16510&ref=codesmith_pr_footer&repository=pnpm%2Fpnpm&return_to=https%3A%2F%2Fgithub.com%2Fpnpm%2Fpnpm%2Fpull%2F16510&signature=2789b898b1a3f50bd5fc6b8dc5b063e0f7664a557a31832b447530baed399a77"><picture><source media="(prefers-color-scheme: dark)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-light.svg"><img alt="Autofix with [code]smith" src="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-dark.svg"></picture></a>
<sup>Need help on this PR? Tag <code>@codesmith-bot</code> with what you need. Autofix is disabled.</sup>

<!-- codesmith:autofix:disabled -->
<!-- /codesmith:footer -->
