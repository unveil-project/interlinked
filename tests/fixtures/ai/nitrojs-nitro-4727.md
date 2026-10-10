### 🔗 Linked issue

Resolves #4648

### ❓ Type of change

- [ ] 📖 Documentation (updates to the documentation, readme, or JSdoc annotations)
- [x] 🐞 Bug fix (a non-breaking change that fixes an issue)
- [ ] 👌 Enhancement (improving an existing functionality like performance)
- [ ] ✨ New feature (a non-breaking change that adds functionality)
- [ ] 🧹 Chore (updates to the build process or auxiliary tools and libraries)
- [ ] ⚠️ Breaking change (fix or feature that would cause existing functionality to change)

### 📚 Description

For a public assets base with `maxAge` (Nuxt's `/_nuxt/` is one), nitro writes a `_headers` rule with `cache-control: public, max-age=<maxAge>, immutable`. The `cloudflare-module` entry hands every path under such a base to `env.ASSETS.fetch()` and returns the result as it is. Cloudflare's asset layer applies the `_headers` rule to a 404 as well, so a missing file comes back as `404` with the one year immutable header. A 404 with an explicit `max-age` is cacheable, so the browser keeps "this file does not exist" until the user does a hard reload. This is the `Failed to fetch dynamically imported module` case described in #4648. Because the entry answers before h3 runs, route rules and server middleware cannot change it.

This PR changes `src/presets/cloudflare/runtime/cloudflare-module.ts`. When `env.ASSETS.fetch()` returns a 404 whose `cache-control` has a positive `max-age` or `immutable`, the entry returns a copy of the response with `cache-control: no-store`. Successful asset responses and 404s without a long lived cache policy are passed through untouched.

Test: `test/presets/cloudflare-module.test.ts` runs the built fixture in Miniflare with the `ASSETS` binding. It requests an existing file under the fixture's `/build` base (expects 200 and `max-age=3600`) and a missing one (expects 404 and `no-store`). The missing file case fails on `main` with `public, max-age=3600, immutable` and passes with this change.

What I ran:

- `pnpm fmt`, `pnpm lint` and `pnpm typecheck`: clean.
- `vitest run test/presets/cloudflare-module.test.ts test/presets/cloudflare-pages.test.ts test/unit`: 601 passed, 1 failed. The failure is `virtual-routing.test.ts > node format handler interop > receives the real Request when registered as a fetch object`, and it fails the same way on an untouched `main`.

What I did not run: a real Cloudflare deployment or `wrangler dev` with a Nuxt app. The full `pnpm test` pipeline was not run.

### 📝 Checklist

- [x] I have linked an issue or discussion.
- [ ] I have updated the documentation accordingly.