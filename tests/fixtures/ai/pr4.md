### What does this PR do?

Frames from `node_modules` currently have the same emphasis as application frames. Dim the entire dependency frame in the native error printer and use 50% opacity for dependency frames in the DevServer error overlay.

- Match `node_modules` as a directory component, including relative paths, Windows separators, mixed separators, and file URLs. Similar directory names and a file named `node_modules` retain normal styling.
- Disable nested name/location colors inside a dimmed terminal frame, and reset styling before the next line. Plain-text output stays the same. The shared native printer also covers `Bun.inspect` and `console.error`.
- Exercise the rendered overlay through the browser error-reporting flow. The happy-dom client fixture converts cross-realm `ArrayBuffer` request bodies to typed-array views so happy-dom sends their bytes instead of stringifying them.

Fixes #17507. The earlier draft #25786 was closed without merging.

### How did you verify your code works?

On macOS arm64, with a locally compiled debug build:

- `bun bd test test/js/bun/util/inspect-error.test.js` — 51 passed.
- `bun bd test test/bake/dev/html.test.ts test/bake/dev/harness.test.ts test/bake/dev/sourcemap.test.ts` — 17 passed.
- The new native tests fail on the unmodified system Bun with `USE_SYSTEM_BUN=1` because dependency frames still contain normal highlighting; the new overlay test fails because all six dependency-path variants have opacity 1 instead of 0.5. The negative path cases retain normal styling.
- `rustfmt --check --edition 2024 src/jsc/VirtualMachine.rs`, Prettier checks for the changed JS/TS/CSS files, and `git diff --check` passed.
