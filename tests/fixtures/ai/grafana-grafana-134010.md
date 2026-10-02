**What is this feature?**

Load folder-picker results in pages and keep earlier pages when more folders are requested. Failed child-page requests can be retried without losing the loaded hierarchy.

**Why do we need this feature?**

The app-platform picker currently stops at the first search page. Use the backend's existing offset/limit support through an internal RTK Query endpoint, preserving the current parent and permission filters.

**Who is this feature for?**

Users browsing or selecting folders with more than 50 children, including custom roots and Shared with me.

**Which issue(s) does this PR fix?**:

Fixes #133932

**Special notes for your reviewer:**

The pagination regressions fail before the fix. All 61 NestedFolderPicker tests pass, including real-store/MSW coverage for 103 folders and a failed/retried child page. Scoped ESLint/formatting and the full `yarn typecheck` (root, Rspack, and 15 package projects) pass.

This stays behind the existing `foldersAppPlatformAPI` feature toggle and does not modify generated API code or backend behavior.

Please check that:
- [ ] It works as expected from a user's perspective.
- [x] If this is a pre-GA feature, it is behind a feature toggle.
- [x] The docs are updated where needed: no configuration or public API changes requiring documentation.
