### What does this PR do?

Ignore custom own properties when cloning Maps and Sets, matching Node and structured-clone semantics. Bun currently visits those properties as ordinary object data. This can invoke getters, copy extra fields, or reject an otherwise valid collection because an ignored property contains a function.

Minimal repro:

```js
const map = new Map([["key", 42]]);
map.extra = () => {};
console.log([...structuredClone(map)]); // [["key", 42]]
```

Finish each Map/Set after its entries, retaining the existing empty property-section markers. Previously persisted records with non-empty property sections remain readable. Cycles and aliases are preserved, and uncloneable collection entries still reject. Tests cover direct cloning, serialization, workers, message ports, and advanced child IPC.

The subprocess serialization helpers explicitly request Buffers and assert the child exit status so failed child serialization cannot be mistaken for a successful round trip.

### How did you verify your code works?

Native Linux x64 release builds from upstream base `4b02e1031d6195d96fc0446dfbff49297f89f2d6`, built with `bun scripts/build.ts --profile=release --lto=off`.

- Before: the focused own-property cases report 23 passed and 73 failed on the unpatched build.
- After: both complete clone suites pass: 396 tests, zero failures (`test/js/web/workers/structured-clone.test.ts` and `structuredClone-classes.test.ts`; patched release binary with `--expose-internals` and `--max-concurrency 2`).
- Node v24.19.0 passes direct clone/serialization checks, including cycles and invalid entries, and own-property transfers through MessagePort and Worker.
- Independent code review found no actionable P0–P2 findings.
