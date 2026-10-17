## Pre-flight checklist

- [x] I have read the [Contributing Guidelines on pull requests](https://github.com/facebook/docusaurus/blob/main/CONTRIBUTING.md#pull-requests).
- [x] **If this is a code change**: I have written unit tests and/or added dogfooding pages to fully verify the new behavior.
- [ ] **If this is a new API or substantial change**: the PR has an accompanying issue (closes #0000) and the maintainers have approved on my working plan.

## Motivation

Stacked PR 2/3 to modernize `@docusaurus/plugin-sitemap` XML generation without any sitemap regression. No sitemap code change: this PR only adds tests.

The new tests in `xml.test.ts` pin the byte-exact output of `sitemapItemsToXmlString()` (today's `sitemap@7` output) with inline snapshots:

- XML declaration and `<urlset>` namespaces (`news`, `xhtml`, `image`, `video`)
- `lastmod` with `null`/`'date'`/`'datetime'`: epoch 0, `''`, `YYYY-MM-DD` expanded to a datetime, timezone offsets converted to UTC (which can shift the date)
- `changefreq` and `priority` (`toFixed(1)` rounding, `0` emits `0.0`), and the fixed tag order
- URL escaping and WHATWG normalization: `&`, `<`, `>`, quotes, apostrophes, spaces, CJK, accents, emoji, already percent-encoded segments, query and hash, trailing slashes, host/port/IDN, dot segments, a very long URL
- one item, and 10k items (order and duplicates kept)
- undocumented `sitemap` lib fields (`links`, `img`) that users can return from `createSitemapItems()`, so a future custom serializer can't silently drop them

Not pinned (pre-existing lib bug, out of scope): an invalid item (relative URL, invalid `lastmod`) rejects cleanly only when it's the **first** item. At any other position, it throws an uncaught exception from the stream and the promise never settles.

## Test Plan

- `pnpm test packages/docusaurus-plugin-sitemap`, full `pnpm test`
- The output entries are split per `<url>` for readability, but the helper asserts the exact header/footer, and joining the entries gives back the exact XML

### Test links

Deploy preview: https://deploy-preview-12563--docusaurus-2.netlify.app/

## Related issues/PRs

- Stacked PRs: #12553 → this PR → #12564

🤖 Generated with [Claude Code](https://claude.com/claude-code)
