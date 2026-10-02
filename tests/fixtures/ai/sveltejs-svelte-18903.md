`validate_code` only lets code points above U+FFFF through for planes 1-2 and part of plane 14, so every other valid code point becomes U+0000. That includes plane 3 (CJK Extension G/H, e.g. `&#x30EDD;` 𰻝) and the supplementary private use planes 15-16 that icon fonts use (e.g. `&#xF0001;`). The [spec](https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state) only replaces 0, surrogates and values above 0x10FFFF.

For `<span title="&#x30EDD;">&#x30EDD; &#xF0001;</span>`, the server output on main is `<span title="\^@">\^@ \^@</span>`, so the text renders empty and the title shows replacement characters (client output has the same NUL in the attribute). With this change they decode to the actual characters. I kept per-plane ranges like #15823 did for plane 14; letting everything up to 0x10FFFF through would also work if you prefer that.

- Ran: `pnpm test runtime-legacy -t html-entities`: dom, hydrate and ssr fail on main, 15/15 pass with the fix
- Ran: `pnpm test` (reran the suites that timed out on their own): all pass
- Ran: `pnpm check`, `eslint` and `prettier --check .`: clean

### Before submitting the PR, please make sure you do the following

- [ ] It's really useful if your PR references an issue where it is discussed ahead of time. In many cases, features are absent for a reason. For large changes, please create an RFC: https://github.com/sveltejs/rfcs
- [x] Prefix your PR title with `feat:`, `fix:`, `chore:`, or `docs:`.
- [x] This message body should clearly illustrate what problems it solves.
- [x] Ideally, include a test that fails without this PR but passes with it.
- [x] If this PR changes code within `packages/svelte/src`, add a changeset (`npx changeset`).

### Tests and linting

- [x] Run the tests with `pnpm test` and lint the project with `pnpm lint`
