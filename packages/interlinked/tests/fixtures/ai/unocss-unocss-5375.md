### What changed

`transformDirectives()` rewrites the whole file with `code.update(0, code.original.length, newCode)` when it strips empty rules.

### Why

`newCode` is derived from `code.toString()`, so it already contains the inserts produced while expanding `@apply`. `update()` keeps content appended/prepended inside the range, so those inserts are emitted a second time. magic-string 1.4.3 ("Preserve inserts when `update` spans several chunks") made this reachable; 1.4.2 and earlier dropped them, which is why it went unnoticed — the repo lockfile still pins 1.4.1.

`overwrite()` is `update(..., { overwrite: true })`, which discards the now-redundant inserts, so the file is replaced with exactly `newCode`.

### How I checked

`pnpm test test/transformer-directives.test.ts` (76 tests):

- magic-string 1.4.1, unpatched: 76 pass
- magic-string 1.4.3, unpatched: 24 fail (snapshots show the duplicated declarations appended at the end of the file)
- magic-string 1.4.3, patched: 76 pass
- magic-string 1.4.1, patched: 76 pass

The change is independent of the magic-string version. No new test is added because the pinned 1.4.1 cannot reproduce the old behaviour; if you want CI to cover it, bumping the `magic-string` catalog entry to `^1.4.3` would make the suite catch it (kept out of this PR to stay minimal).

fixes #5373