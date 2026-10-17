### What does it do?

`build` and `develop` now load their implementation (`node/build`, `node/develop`) inside the command action instead of importing it at the top of the module. Only the options types are still imported statically.

### Why is it needed?

`cli/commands/index.ts` imports every command module when the CLI starts. Because `commands/build.ts` statically imported `node/build`, **every** CLI command, including `strapi start`, loaded the whole admin build toolchain:

```
commands/build.ts → node/build.ts → node/staticFiles.ts → @strapi/admin/_internal → admin/src/components/DefaultDocument
```

plus `react-dom/server`, `@strapi/typescript-utils` with the full `typescript` compiler, `esbuild`/`esbuild-register`, `browserslist`/`caniuse-lite` and the dependency-check helpers. None of it is used outside `build`/`develop`.

This also cancels out existing work to keep `start` light: `start.ts` has a `tryQuickOutDir` fast path whose comment says it is there to skip loading `@strapi/typescript-utils`, and `node/develop.ts` already lazy-loads its worker-only deps (#26268). The eager `build` import loaded all of that anyway.

A practical consequence: `strapi start` crashes if `@strapi/admin/dist/admin` is absent, even though the admin panel is already prebuilt into the app's `build` directory. Production images that prune admin source to save space hit:

```
Error: Cannot find module './admin/src/components/DefaultDocument.js'
```

With this change, `start` boots fine without it.

#### Benchmarks

Apple M1, 16 GB, Node v24.21.0. "Before" is `develop` at 93476f908c and "after" is this branch, both built with `yarn build:code`. Runs alternate between before and after, and the values are medians.

**Loading the CLI entry** (`require('dist/cli.js')`, which every command pays for, 15 fresh processes each, memory measured after `gc()`):

| | before | after | change |
| --- | --- | --- | --- |
| Load time | 778 ms | 662 ms | −116 ms (−15%) |
| Modules loaded | 2,688 | 2,594 | −94 |
| Heap used | 77.0 MB | 55.1 MB | −21.9 MB (−28%) |
| RSS | 298.0 MB | 252.8 MB | −45.3 MB (−15%) |

**`strapi version`, full process wall time** (20 runs each):

| | before | after | change |
| --- | --- | --- | --- |
| Wall time | 804 ms | 648 ms | −156 ms (−19%) |

**`strapi start` on `examples/getstarted`** (`NODE_ENV=production`, SQLite, telemetry disabled, 10 runs each). "Ready" is the time from spawn until `/_health` answers. Memory is sampled 1.5 s after ready, after `gc()`:

| | before | after | change |
| --- | --- | --- | --- |
| Ready | 2,263 ms | 2,096 ms | −167 ms (−7%) |
| Modules loaded | 4,517 | 4,423 | −94 |
| Heap used | 181.5 MB | 161.0 MB | −20.5 MB (−11%) |
| RSS | 528.7 MB | 509.2 MB | −19.5 MB (−4%) |

RSS for `start` is noisy (the before runs ranged from 463 to 539 MB), and so are the tails of the timings. Module counts and heap are stable run to run.

**`strapi start` with `@strapi/admin/dist/admin` removed:** before, it fails with `Cannot find module './admin/src/components/DefaultDocument.js'`. After, it boots normally.

These savings apply to `start` when telemetry is disabled. With telemetry enabled, the metrics sender still loads `@strapi/typescript-utils` later during boot, so the TypeScript part of the saving moves rather than disappears.

### How to test it?

1. `yarn build:code`
2. Check that `build` and `develop` still work: `cd examples/getstarted && yarn build`, then `yarn develop`.
3. Check what the CLI loads:
   ```bash
   cd packages/core/strapi
   node -e "require('./dist/cli.js'); console.log(Object.keys(require.cache).filter(k => /staticFiles|admin\/dist\/(_internal|admin)/.test(k)))"
   ```
   Before this change it lists `staticFiles.js`, `_internal.js` and `DefaultDocument.js`. After, it prints `[]`.
4. Optionally, move `packages/core/admin/dist/admin` aside and run `yarn start` in `examples/getstarted` (production env vars set). Before this change it crashes at boot; after, it starts.

The new unit test `src/cli/commands/__tests__/lazy-commands.test.ts` mocks `node/build` and `node/develop` to throw when loaded, then imports the command modules. It fails on `develop` and passes with this change.

### Related issue(s)/PR(s)

- #26268 (lazy-require worker-only deps in the dev primary), which follows the same idea for `node/develop`

#### Possible follow-ups (not in this PR)

I profiled every command module in a fresh process, and compared a `strapi start` boot through the CLI with the same app booted directly via `createStrapi`. After this PR, the CLI adds about 300 modules on top of what `start` needs. Almost all of them come from `@strapi/cloud-cli`.

1. **Register the `@strapi/cloud-cli` commands without loading the package.** `buildStrapiCloudCommands` imports every cloud command implementation at startup. On top of `@strapi/core`, that adds 250 modules (`jose`, `jwks-rsa`, `cli-progress`, `ora`, proxy agents), about 54 ms and 3.7 MB of heap, to every CLI invocation, `start` included. The commands could be registered from metadata (name, description, options), and the implementation loaded only inside the action.
2. **Stop `strapi start` from writing the cloud CLI config.** `buildStrapiCloudCommands` also runs `initCloudCLIConfig()` on every CLI run, which creates `~/.config/com.strapi.cli/config.json` and writes an `installId` into it. In containers with a read-only or non-writable home directory, this fails on every start. The error is caught by the command loader, which logs `Failed to load command`, and the cloud commands go missing. Running it lazily, on the first cloud command, would avoid both the write and the noise.
3. **Lazy-load `@strapi/core` in lightweight commands.** Almost every command module statically imports `@strapi/core` (2,198 modules, about 550 ms). Because the CLI imports every command up front, `strapi version`, `--help`, `generate`, `templates:generate`, `ts:generate-types` and `telemetry:*` all pay that cost: `strapi version` takes about 650 ms, while its own module needs about 10 ms. Loading core inside each action would make these near-instant. It would not change `start`, which needs core anyway.

`export`, `import` and `transfer` load `@strapi/data-transfer`, but core already loads it at boot for the remote transfer endpoints, so making those lazy would not help `start`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
