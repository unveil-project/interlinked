## Summary
Fixes an uncaught `std::invalid_argument` exception in the Redis inline command decoder (`source/extensions/filters/network/common/redis/codec_impl.cc`, state `InlineStringQuotedEscapeHex`).

## Details
Commit f8f17686 added a bounds check before the hex-escape decode, but it is not sufficient: `s[s.size() - 3] == 'x'` can match an `'x'` that is a *literal* character from earlier in the token rather than the escape introducer. Example trigger: the quoted inline token `"xx\x41"`.

In that case the two characters passed to `std::stoul(..., 16)` are not hex digits, so `stoul` throws `std::invalid_argument`. The decoder's callers only catch `ProtocolError`, so the exception propagates out of `onData` and terminates the process — an unauthenticated remote crash.

The patch validates both characters with `std::isxdigit` before calling `stoul`, and throws `ProtocolError("invalid hex escape in request")` instead, which the existing machinery handles gracefully (connection closed, no crash).

## Testing
- Reproduced the crash with a minimal decoder harness feeding `"xx\x41"` (process terminated via uncaught exception before the patch).
- After the patch, the same input raises `ProtocolError` and the connection is closed cleanly.
- Existing redis codec unit tests unaffected.

**AI tool use disclosure:** AI was used in part for code audit and patch drafting.
