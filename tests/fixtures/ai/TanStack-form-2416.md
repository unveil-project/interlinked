## 🎯 Changes

Raise the Start dependency floor to 1.168.60 in the example and the React Start integration's development dependency. Refresh matching example Router dependencies and the lockfile. The published optional peer range stays unchanged.

Validation: frozen install, `pnpm build:all`, the Start example production build, and a fresh `pnpm test:pr --skip-nx-cache` passed. The first full suite found Knip inspecting stale generated Vue declarations. The same result occurred with unchanged manifests and lockfile, and the fresh source check passed after those generated files were removed. No checker configuration was changed.

## ✅ Checklist

- [x] I have followed the Contributing guide.
- [x] I have tested code changes locally with `pnpm test:pr`.
- [x] I fully understand the code in this pull request, including code generated with AI assistance.

## 🚀 Release Impact

- [ ] This change affects published code, and I have generated a changeset.
- [x] This change is docs/CI/dev-only (no release).


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Chores**
  * Updated the React examples and form package to use newer TanStack Router and Start versions.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->
