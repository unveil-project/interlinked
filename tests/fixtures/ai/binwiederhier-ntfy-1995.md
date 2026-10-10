Fixes #1992.

`Content-Type: text/markdown; charset=utf-8` was not detected as Markdown, because the header was compared to `"text/markdown"` as a whole string. Any media type parameter broke the match.

The header is now parsed with `mime.ParseMediaType` and only the media type is compared. This also covers the `content-type` / `content_type` query parameter, which goes through the same code.

Behaviour that stays the same: matching is still case-insensitive, `text/markdownx` and `text/plain` are not Markdown, and a malformed parameter (e.g. `text/markdown; charset`) is not treated as Markdown, as before.

Tests: a table test with parameter variants (`; charset=utf-8`, `;charset=UTF-8`, `TEXT/Markdown ; charset=utf-8`, `; variant=GFM`) plus negative cases, and one for the query parameter. They fail without the change and pass with it.

I ran the full server tests. Three web app tests (`TestServer_StaticSites`, `TestServer_WebEnabled`, `TestServer_WebApp_MagicLinkLandingPagesNoIndexHeaders`) fail in a clone without a built web app, and they fail the same way on an unmodified `main`. Everything else passes.

I used an AI assistant (Claude Code) while working on this. I reviewed and tested the change myself.
