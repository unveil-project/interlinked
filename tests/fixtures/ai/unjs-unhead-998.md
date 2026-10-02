Extends `test/rules.test.ts` for the canonical, title and script rule groups. After #997 every export had at least one case, so this PR closes the remaining behaviour gaps:

- **non-absolute-canonical**: plain `http://` URLs, non-canonical link rels with relative hrefs, protocol-relative URLs, static and dynamic template-literal hrefs.
- **no-html-in-title**: dynamic titles, `titleTemplate` scope boundary, a lone `>` without a matching `<`, and the `useServerSeoMeta` callee.
- **defer-on-module-script**: explicit `defer: false`, the autofix when `defer` is a middle property (comma handling), and tags built via the `defineScript()` helper.
- **script-src-with-content**: the `textContent` branch (flagged when non-empty, ignored when empty like `innerHTML: ''`) and dynamic `src` values.

18 new cases, all against existing behaviour — no rule changes.

<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Tests**
  * Expanded automated coverage for script configuration and content handling, including deferred scripts, dynamically provided sources, and inline content.
  * Added checks for canonical URL behavior across static, dynamic, and protocol-relative links.
  * Added title metadata cases covering dynamic titles, templates, and additional SEO metadata patterns.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->
