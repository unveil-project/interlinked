Stacked on #1003.

<!---
☝️ PR title should follow conventional commits (https://conventionalcommits.org)
-->

### 🔗 Linked issue

<!-- If it resolves an open issue, please link the issue here. For example "Resolves #123" -->

### ❓ Type of change

<!-- What types of changes does your code introduce? Put an `x` in all the boxes that apply. -->

- [ ] 📖 Documentation (updates to the documentation or readme)
- [x] 🐞 Bug fix (a non-breaking change that fixes an issue)
- [ ] 👌 Enhancement (improving an existing functionality)
- [ ] ✨ New feature (a non-breaking change that adds functionality)
- [ ] 🧹 Chore (updates to the build process or auxiliary tools and libraries)
- [ ] ⚠️ Breaking change (fix or feature that would cause existing functionality to change)

### 📚 Description

<!-- Describe your changes in detail -->
<!-- Why is this change required? What problem does it solve? -->

The DevTools panel did not look or work like the rest of Unhead. Its font files have been empty since #731, so it rendered in system fonts. The Audit tab threw `lib.runLint is not a function` on every run, because `@unhead/cli` stopped exporting `runLint` in #757. The update check failed CORS on every load, and the link checker requested every URL again on every head sync.

Brand:

- The panel bundles Nunito Sans, Hubot Sans, and Fira Code from Fontsource, the same type as unhead.unjs.io.
- Scrollbars use the warm neutral scale, and the grain texture sits behind content instead of over text.
- Below 960px the tabs show icons only, so labels no longer truncate in a narrow dock.

Bugs:

- `@unhead/cli` exports `runAudit`, and the Audit RPC calls it. Migrate runs a dry run first and lists the files it will rewrite before it writes them.
- The update check reads npm dist-tags through a new `unhead:get-dist-tags` RPC on the dev server. A stable install no longer sees a beta tag as an update.
- The link checker checks each URL at most once a minute. It skips cross-origin `HEAD` requests and flags only 404, 410, and 5xx responses.
- The Scripts tab reads sizes from Resource Timing and favicons from each script's own origin, instead of `HEAD` requests and Google's favicon service.
- The Schema tab reads every JSON-LD script, and its required-property ticks agree with its summary.

UX:

- When no page script answers, the panel shows "Connecting" and then "Waiting for your app" instead of empty tabs.
- Type and status filters reset when their last item disappears, and an empty table offers "Clear filters".
- Relative head URLs resolve against the app page instead of `/__unhead/`.
- Tag rows get unique keys, so identical inline scripts no longer expand together.
- Status dots and icon-only buttons have text for screen readers.

![Architecture after this change: the Audit RPC calls the newly exported runAudit, and the update check moves to a dev server RPC](https://github.com/user-attachments/assets/017eec30-26f3-44e6-94f6-312370b9835a)

> 🤖 AI disclosure: [Harlan Agent Kit](https://github.com/harlan-zw/harlan-agent-kit) modified this description. [My AI open-source policy](https://harlanzw.com/blog/ai-in-open-source).


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **New Features**
  * Added audit, migration-preview, and confirmed migration workflows, with shortcuts to open affected files in an editor.
  * Added package update checks and script size information when available.
  * Improved previews for page-relative URLs, favicons, and structured data.
* **Improvements**
  * Added clear connection states when DevTools is connecting or waiting.
  * Improved audit results, tag filtering, empty states, and link checks.
  * Enhanced accessibility and responsive navigation, and updated typography.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->