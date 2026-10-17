Fixes rolldown/rolldown#11086.

### Before

```
foo/
├── tsconfig.json       # { "extends": "missing-package/tsconfig.json" }
└── bar/
    ├── tsconfig.json   # { "include": ["*.js"] }
    └── main.js         # export const answer = 42
```

```console
$ cd foo/bar
$ rolldown main.js --platform node -d dist
 ERROR  Build failed with 1 error:

[RESOLVE_ERROR] Could not resolve 'node:module' in \0rolldown/runtime.js
   ╭─[ \0rolldown/runtime.js:1:31 ]
   │
 1 │ import { createRequire } from 'node:module';
   │                               ──────┬──────
   │                                     ╰──────── Tsconfig not found
───╯
```

The same input builds with `--platform browser`, with `--no-tsconfig`, or from a `cwd` outside the parent folder.

### Problem

- On platform node, the runtime module `\0rolldown/runtime.js` imports `node:module`. `Resolver::resolve` joins this `\0` importer onto `cwd` and calls `resolve_file`, so oxc_resolver searches for a tsconfig from `<cwd>/\0rolldown/` upward.
- No tsconfig owns the runtime, so the search reads every `tsconfig.json` above `cwd`. One that fails to load stops the build, even though no file in the build uses it. Imports from a plugin's `\0` virtual module fail the same way, on any platform.

### After

```rust
} else if importer.to_str().is_some_and(|id| id.starts_with('\0'))
  && matches!(selected_resolver.options().tsconfig, Some(TsconfigDiscovery::Auto))
{
  // A `\0` importer, such as `\0rolldown/runtime.js`, is a virtual module, not a file.
  // `resolve_file` would search for a tsconfig from `<cwd>/<importer>` upward and fail on
  // one that does not load. `resolve` from the same directory skips that search.
  let importer = self.cwd.join(importer);
  selected_resolver.resolve(importer.parent().unwrap_or(&self.cwd), specifier)
} else {
```

```console
$ rolldown main.js --platform node -d dist
<DIR>/main.js  chunk │ size: 0.07 kB

✔ rolldown v1.2.12 Finished in 41.53 ms
```

<details>
<summary>Cause, design, tests</summary>

**Cause.** `crates/rolldown_resolver/src/resolver.rs` `Resolver::resolve`. Since rolldown/rolldown#6873, a relative importer is joined onto `cwd` and passed to `resolve_file`. `resolve_file` runs tsconfig auto-discovery (`find_tsconfig`) before it looks at the specifier, so the error comes back even for a builtin. oxc_resolver skips this search for a non-absolute path such as a virtual module (oxc-project/oxc-resolver#809), but the join onto `cwd` makes the path absolute.

**Design.** With auto-discovery on, a `\0` importer now resolves with `resolve`, from the same directory as before. `resolve` does not run auto-discovery. Everything else keeps `resolve_file`:
- A manual `tsconfig`. It loads one file, so it has no upward search to fail, and `resolve_file` keeps its choice of a referenced project by file.
- Other relative importers. A plugin can pass a relative real file as the importer (`this.resolve('foo', 'src/bar.ts')`), and today `virtual:foo.ts` gets the `paths` of the tsconfig at `cwd`.

The rule is the `\0` prefix, which `ModuleId` also uses to mark a virtual id.

One behavior changes: with auto-discovery, a `\0` virtual module no longer gets `paths` from a tsconfig whose `include` matches its path under `cwd`, such as `\0virtual:foo.ts` next to a tsconfig with the default `include`. The transform already gives such a module no tsconfig, because `options_for_file` receives the raw `\0` id and oxc_resolver skips it.

Options I did not take:
- Skip the tsconfig for builtin specifiers. oxc_resolver applies tsconfig `paths` before its builtin check, so a user file can map `node:module` or `fs` today.
- Special-case only `\0rolldown/runtime.js`. Imports from a plugin's `\0` virtual module hit the same search.

Not in this PR: `rolldown_plugin_vite_resolve` `resolve_raw` joins the importer onto `root` the same way. With `tsconfigPaths` on, a relative import from a `\0` importer reaches it. I can follow up with the same rule there if you want it.

**Tests.**
- `crates/rolldown/tests/rolldown/issues/11086`: platform node, a plain `main.js`, and a `tsconfig.json` whose `extends` does not resolve. On `main` it fails with the error above.
- `packages/rolldown/tests/fixtures/tsconfig/virtual-module-broken-tsconfig`: a plugin's `\0virtual:entry` imports `./dep.js` next to a tsconfig that does not load. On `main` it fails with `Could not resolve './dep.js' in \0virtual:entry` (`Tsconfig not found`).

**Checks.**
- `cargo test --workspace --exclude rolldown_binding`
- node tests: `test:main` and `test:watcher`
- `cargo clippy -p rolldown_resolver -p rolldown --all-targets -- --deny warnings`, `cargo fmt --all --check`, `typos`, `cargo ls-lint`, `vp check`
- Vite 8.3.2 with `environments.ssr.optimizeDeps.include` fails in its SSR dependency optimizer with the same error. With this build, `vite --force` starts and serves the page.

</details>

---
AI disclosure: AI models helped us find this issue, write the change, and review it.

