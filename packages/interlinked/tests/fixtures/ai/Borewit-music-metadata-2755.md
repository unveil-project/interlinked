`parseBuffer` spends 7.6 s on a 125 KB MP3 whose TXXX frame holds a long run of NUL bytes followed by one non-NUL byte. The same file with that byte moved to the front takes 5 ms.

Measured on 11.16.0, Node 26, one run, `parseBuffer(mp3, {mimeType: 'audio/mpeg'})` with no other options. The two middle columns are the **same file length**; only the position of a single `0x41` differs.

| file | run then `A` | `A` then run | ×/doubling |
| --- | --- | --- | --- |
| 8 KB | 53 ms | 0.78 ms | |
| 16 KB | 141 ms | 0.58 ms | ×2.64 |
| 31 KB | 519 ms | 0.58 ms | ×3.69 |
| 63 KB | 1 962 ms | 0.76 ms | ×3.78 |
| 125 KB | 7 621 ms | 5.05 ms | ×3.88 |

The absolute milliseconds move with machine load — I have seen the 125 KB row anywhere from 5.1 s to 7.6 s across sessions. The ratio is the stable part: it converges on ×4 per doubling.

## Where

`lib/id3v2/FrameParser.ts:226`, the TXXX branch:

```ts
text: this.splitValue(type, util.decodeString(idAndData.data, encoding).replace(/\x00+$/, ''))
```

`\x00+$` has no fixed start, so the engine retries the whole run from every offset inside it, and each attempt fails at `$` because of the trailing non-NUL byte.

## Reachability

Default path, no options. The tag size field in the ID3v2 header is "a 32 bit synchsafe integer ... making a total of 28 effective bits (representing up to 256MB)" (ID3v2.4.0-structure), so the run length is caller-controlled up to that bound, and the parse runs on the main thread.

## The fix is already in the file

`FrameParser.trimNullPadding` (line 620) is an O(n) backward scan. Commit `0e4156b9` ("id3v2: tighten frame decoding, trim nulls without regex, reduce allocations") introduced it and applied it to four call sites; `64d2148d` restored the regular expression on the TXXX path only, and the other three still use it (lines 171, 415, 617). Putting it back takes the 125 KB case from 7 621 ms to 96 ms.

Semantics are identical — `$` without the `m` flag anchors only at end of input, so both express "a trailing run of U+0000". The run itself still reaches `splitValue`, which is correct: text information frames are "multiple strings, stored as a null separated list" (ID3v2.4.0-frames, text information frames section), and TXXX is section 4.2.6.

## One caveat worth naming

Reverting the fix leaves the existing suite green — 903 passing either way on `master`. I also broke `trimNullPadding` deliberately, making it strip leading NULs too, and the suite was still 903 passing, so the current tests do not constrain this helper at all. The new regression test carries it alone: without the fix it exceeds the 40 s mocha timeout; with it the case runs in 546 ms.

A second site has the same shape, but I have not measured it end to end: `stripNulls` in `lib/common/Util.ts:93` runs `replace(/^\x00+/g, '')` then `replace(/\x00+$/g, '')`, and the second one backtracks the same way. It is reached from `lib/asf/AsfUtil.ts` for ASF/WMA attributes. Happy to send that separately.

PR follows.
