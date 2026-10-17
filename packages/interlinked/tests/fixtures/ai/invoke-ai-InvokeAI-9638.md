## Summary

Docs fix. Four relative links in the developer guides resolve to pages that don't exist. `errorOnRelativeLinks` is off in `docs/astro.config.mjs`, so the build doesn't catch them.

- `development/Guides/creating-nodes.mdx` (2 links): `../../../workflows/community-nodes` resolves to `/workflows/community-nodes`. Now `/features/workflows/community-nodes`, the same form `development/Architecture/invocations.mdx` already uses.
- `development/Setup/dev-environment.mdx`: `../tests` resolves to `/development/setup/tests`. Now `/development/guides/tests`.
- `development/Guides/creating-node-pack.mdx`: `invocation-api.md` has no matching page. Now `/development/guides/api-development`, which is where `src/config/redirects.ts` sends the old `/nodes/invocation-api` URL.

Root links get the base path added by `rehypePrefixBaseToRootLinks`, so they work on GitHub Pages too.

## QA Instructions

Docs only. Each target page exists under `docs/src/content/docs/`.

## Checklist

- [x] _The PR has a short but descriptive title, suitable for a changelog_
- [ ] _Tests added / updated (if applicable)_
- [ ] _❗Changes to a redux slice have a corresponding migration_
- [x] _Documentation added / updated (if applicable)_
- [ ] _Updated `What's New` copy (if doing a release after this PR)_
