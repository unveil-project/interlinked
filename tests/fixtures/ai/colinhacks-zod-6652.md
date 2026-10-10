`.max()`, `.length()` and `.size()` on arrays, sets and maps now reject an oversized input before any element is parsed. The bound used to run after the walk, so it bounded nothing: `z.array(z.string().uuid()).max(100)` given a million numbers built 1,000,001 issues before it reported `too_big`.

```ts
z.array(z.string().uuid()).max(100).safeParse(Array(1_000_000).fill(0));
// one too_big issue in under a millisecond, was 1,000,001 issues in ~450 ms
```

Only size checks that come before every other check take part, since something like `.overwrite()` can shrink the value first. The early rejection aborts, so a later `.refine()` never sees elements that weren't parsed, and an oversized input reports just the `too_big` issue rather than its element issues too. The compiled path gets the same check ahead of its loop. Unbounded containers are unchanged.

| axis | result |
| --- | --- |
| runtime | The check wraps `parse` only on schemas that carry an upper bound, so an unbounded container runs the same code as before. `z.array(z.string()).max(100)` over 10 items: 65.9 → 67.4 ns (+1–3%, interleaved, but taken at load 10–20). Construction within noise. |
| memory | Unbounded: unchanged. Bounded: +121 B per schema (3421 → 3542) for the wrapper closure. |
| bundle | `zod/mini` array fixture +243 B gzipped (3311 → 3554, +7.3%), +227 with a `maxLength` check. Classic array +215 (+1.0%). Bundles without an array, set or map pay nothing (`zod-mini-object` unchanged). |

Putting the check inside the existing parse closure was smaller (~190 B) but pushed it past V8's inlining budget: `z.array(z.string()).max(n)` parses went 58 → 71 ns.

Fixes #6643
