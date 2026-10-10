fixes #23679

Since #23653 `getHtmlFilename()` strips the query, so `transformIndexHtml('/?foo=bar', html)` gets the root directory as `filename`. `devHtmlHook` only checked `fs.existsSync(filename)`, which is true for a directory, so the URL was treated as a real HTML file and the inline `<style>` proxy module ended up with `mod.file === '/'`, and `ensureWatchedFile` added `/` to the watcher.

It now requires `filename` to be a file (`tryStatSync(filename)?.isFile()`), so this case goes back to the virtual `\0` proxy path it used before 8.3.3. I went with that over computing `trailingSlash` from the stripped path, since `/?foo=bar` + `index.html` would need extra handling to put `index.html` before the query.

Test in `indexHtml.spec.ts`: calls `transformIndexHtml('/?foo=bar', …)` with an inline `<style>` and asserts no directory gets watched. On `main` it watches `/`.

AI disclosure: I used an AI coding tool to help write this. I reviewed the change, checked the test fails without the fix, and ran the `packages/vite` unit tests (no new failures).
