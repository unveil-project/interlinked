Thanks for the careful read.

- **`normalize: true` flip** — agreed this is the one decision for the maintainers. I've left it as a reject (consistent with the non-normalizing path) and flagged the behaviour change in the PR body rather than silently reverting; happy to add a changelog line or a `// TODO(5.0)` marker near the throw if that's the preferred way to surface it.
- **Per-call regex cost** — considered, and I kept the guard in the parse path deliberately so the check is local and obvious rather than folded into `regexes.ts` (which stays untouched). The short-circuit only does real work when a control char is present.
- **ipv6/cidrv6 not trimmed** — right, and as you noted it's correct either way since `new URL()` already rejects bracketed-with-whitespace before the guard matters.
- **Test hardening** — good call, done in 98a6a52: the test now asserts the rejection surfaces a real `error.issues` entry, so a future refactor that stops throwing can't silently re-pass with `success: false` from some other cause. Full suite still green (3965 passing).
