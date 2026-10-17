Fixes #16054.

`redirect()` with a non-ASCII pathname (e.g. `/ㄱ`, `/café`) throws a 500 — Node.js rejects header values containing bytes outside Latin-1 with _"this string contains characters that cannot be used in HTTP headers"_.

Wrap `location` in `encodeURI()` before setting the `Location` header. `encodeURI` is idempotent (it skips `%`-sequences, so already-percent-encoded URIs pass through unchanged) and preserves the characters that matter for redirect targets (`?`, `#`, `/`, `&`, `=`).