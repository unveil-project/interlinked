Landed in `b1ce3ce` (pushed to `main`, all 8 CI jobs green: gem build, RuboCop, Coverage, offline tests on Ruby 3.1/3.2/3.3/3.4/head).

`Truffle::UnicodeSanitizer.sanitize_surrogates(text)` in the new `lib/truffle/unicode_sanitizer.rb`. Ports pi `ai/src/utils/sanitize-unicode.ts`.

- Strips lone surrogate byte sequences matching `/\xED[\xA0-\xBF][\x80-\xBF]/n` (the WTF-8/CESU-8 encoding of U+D800-U+DFFF).
- Idiomatic divergence documented in the source: pi works on UTF-16 code units and drops unpaired surrogates while keeping pairs; Ruby is UTF-8 where a valid astral char is a single codepoint, so only the invalid surrogate BYTES get removed. Emoji and the adjacent valid range U+D000-U+D7FF (ED 80-9F) are preserved.
- Clean input returns the same object, so a frozen string stays frozen.

9 offline tests (`test/test_unicode_sanitizer.rb`): lone high/low surrogate, adjacent malformed pair, preserved emoji, the boundary codepoint U+D7FF, same-object clean ASCII, frozen clean string, JSON round-trip, UTF-8 output encoding.

Two mutations proven red then reverted byte-identical: widening the second byte range `\xA0`->`\x80` over-strips U+D7FF (1 fail); inverting the clean-input early-return `unless`->`if` breaks 6 tests + 1 error.

Provider-serializer wiring (calling this under `lib/truffle/providers/`) is deferred to a later slice to keep this atomic and off your CLI/agent files.
