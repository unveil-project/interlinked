### What changes were proposed in this pull request?

For the UTF8_LCASE collation, `CollationSupport.Contains` calls
`CollationAwareUTF8String.lowercaseContains`. When both operands are full ASCII, its fast path
ran `target.toLowerCase().contains(pattern.toLowerCase())`, which builds a lowercased copy of the
whole target (a new byte array plus a new `UTF8String`) and of the pattern, searches the copies,
and then throws them away.

This PR replaces that fast path with `lowercaseContainsAscii`, which searches the original bytes
and folds case as it compares, so it allocates nothing:

- ASCII case folding maps each byte to one byte (`A`-`Z` to `a`-`z`), so the search can walk the
  original target without changing any offsets.
- The scan loop compares each target byte against both the lowercase and uppercase forms of the
  pattern's first byte, so it does no case folding itself. The comparison is almost always false,
  so the branch predicts well. Folding a byte per position instead would put a data-dependent
  branch in the loop, which mispredicts about half the time on mixed-case text.
- Only after a first-byte hit does the inner loop compare the remaining bytes with both sides
  folded to lower case.
- Two small helpers, `foldAsciiLowerCase` and `foldAsciiUpperCase`, do the folding.

The search has the same shape as `UTF8String.contains`: a first-byte prefilter followed by a
byte-wise match. The non-ASCII slow path is unchanged.

### Why are the changes needed?

Case-insensitive substring search over a UTF8_LCASE column, such as `contains(log_line, 'error')`,
runs once per row. On the ASCII path the old code allocated a lowercased copy of every row's string
even though case folding needs no copy. It also lowercased the entire string before searching, so a
match near the start of a long string still paid to lowercase all of it.

### Does this PR introduce _any_ user-facing change?

No. Results are the same for every input.

### How was this patch tested?

Existing `CollationSupportSuite.testContains` cases cover the empty string, matches at the first
and last positions, non-letter first bytes, and case differences in the target, the pattern, and
the inner match. This PR adds cases for the paths the suite didn't cover:

- a false start (the first byte matches but the rest doesn't, and a real match comes later), and a
  partial match that must not count;
- bytes just outside `A`-`Z` and `a`-`z` (`@`, `[`, `` ` ``, `{`), which must not fold;
- a pattern longer than a non-empty target.

To check the new cases catch real bugs, the code was broken on purpose two ways: a scan that gives
up after its first failed attempt, and a `foldAsciiUpperCase` range that starts one character
early. Each break failed the suite at one of the new cases, and both passed the suite before this
PR.

Performance was measured with a local benchmark built on Spark's `Benchmark` harness; the
benchmark itself is not part of this PR. It calls `CollationSupport.Contains.exec` under UTF8_LCASE
on 16,000 random mixed-case ASCII lines of 80 characters, searching for the pattern `error`. Each
line has a mixed-case occurrence near the start, one near the end, or none. Best time in ns/row
(JDK 17, Intel Xeon 6975P-C):

| case | master | this PR | speedup |
|---|---|---|---|
| match near start | 475.0 | 20.7 | 23x |
| match near end | 588.5 | 127.0 | 4.6x |
| no match | 597.5 | 142.0 | 4.2x |

The master baseline does not include SPARK-59951 (#59198), which makes `UTF8String.toLowerCase`
cheaper on ASCII input. With that change applied, the old path would be somewhat faster than shown
here, but it would still allocate a lowercased copy of every mixed-case target.

### Was this patch authored or co-authored using generative AI tooling?

Generated-by: Isaac

This pull request and its description were written by Isaac.
