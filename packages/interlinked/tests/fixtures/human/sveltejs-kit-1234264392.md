Yeah, 450+ has a peer dependency of `vite@^3.1.0-beta.1`.

People who have pinned their dependencies and use automated dependency updates (like with Renovate Bot) may find `@sveltejs/kit` is getting updated to 450+, but `vite` remains at `3.0.9` (latest stable). (ie. `unmet peer vite@^3.1.0-beta.1: found 3.0.9`), which throws the `writeBundle` error during build.

The workaround, like @HenrijsS mentioned, is to update `vite` in your `package.json`.
