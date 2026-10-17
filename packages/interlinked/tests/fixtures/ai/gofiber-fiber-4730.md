# Description

`docs/api/redirect.md` has two examples that do not compile and two signatures that are out of date with `redirect.go`:

- The `With` and `WithInput` examples pass `c.Redirect().Message("status")` and `c.Redirect().OldInput("name")` to `SendString`. Those return `FlashMessage` and `OldInputData` structs (`redirect.go:257,318`), so `go build` fails with `cannot use c.Redirect().Message("status") (value of struct type fiber.FlashMessage) as string value in argument to c.SendString`. Fixed with `.Value`, as the earlier examples on the page already do.
- `Back(fallback string)` -> `Back(fallback ...string)` (`redirect.go:411`).
- `With(key, value string)` -> `With(key, value string, level ...uint8)` (`redirect.go:164`), plus one sentence saying the optional `level` sets the message's `Level` and defaults to `0`.

Verified by building a small program against this branch (`replace` to the local checkout): the old examples fail with the error above; the fixed ones, `Back()` with no fallback and `With("k", "v", 2)` all build.

## Changes introduced

- [x] Documentation Update: `docs/api/redirect.md` (signatures for `Back` and `With`, `.Value` in two examples).

## Type of change

- [x] Documentation update (changes to documentation)

## Checklist

- [x] Updated the documentation in the `/docs/` directory for [Fiber's documentation](https://docs.gofiber.io/).

Prepared with AI assistance (Claude Code) and reviewed with GitHub Copilot.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

<!-- pr-command-hint -->
<sub>🤖 Maintainers: `/generate` re-runs the code generators on this branch</sub>
