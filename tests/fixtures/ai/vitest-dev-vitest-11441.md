fix(runtime): reapply `test.env` before every file in a reused worker

Under `isolate: false` a worker is reused across test files, but `config.env`
is merged into `process.env` only once, when the worker is spawned:

- `packages/vitest/src/node/pool.ts` builds the worker env from
  `...ctx.config.env, ...project.config.env`
- `packages/vitest/src/node/config/serializeConfig.ts` serializes
  `env: { ...viteConfig?.env, ...config.env }`

Nothing reapplies those keys per file, so a file that assigns to one of them
leaks its value into every later file in the same worker. Vitest 4 reapplied
`test.env` before each file; 5.0.3 does not, and the 5.0 migration guide does
not mention the change.

### Reproduction

8 files, `isolate: false`, `maxWorkers: 1` so they share a worker. Each file
reads `DATABASE_URL` at module scope and the first one overwrites it:

```ts
// f01.test.ts
const seenOnEntry = process.env.DATABASE_URL
process.env.DATABASE_URL = 'postgres://h/private-01'
it('f01 starts with the configured test.env value', () => {
  expect(seenOnEntry).toBe('postgres://h/shared')
})
```

On 5.0.3: **6 failed | 2 passed (8)**. With this change: **8 passed (8)**.

### The fix

`runBaseTests.run` now calls `applyConfigEnv(config.env)` inside the per-file
loop.

The placement matters. With `isolate: false` and `maxWorkers: 1`,
`groupSpecs` (`packages/vitest/src/node/pool.ts`) explicitly batches every file
into a single run request, so a reapplication placed in the per-run setup would
never fire between files.

`applyConfigEnv` only restores keys the config actually declares. Keys the
config does not mention still leak between files, which is the documented
behaviour of `isolate: false` and is unchanged — there is a test pinning that.

Values are stringified the same way the spawn-time merge does, because Vite's
own keys (`PROD`, `DEV`, `SSR`) reach `config.env` as booleans and assigning a
boolean to `process.env` does not yield `'1'` / `''`.

### Tests

`test/e2e/test/isolate-false-reapplies-env.test.ts`:

- both `forks` and `threads`, `isolate: false`, `maxWorkers: 1`
- each file logs its pid and the test asserts both files shared a worker, so it
  fails loudly instead of silently going vacuous if scheduling changes. With more
  workers the files are split across them, the leak cannot occur, and the test
  would pass with the bug still present.
- a third test pins that unconfigured keys still leak

Without this change the two `test.env` cases fail and the unconfigured-keys case
still passes. Full unit suite is unchanged: the same 36 spec files fail before
and after, all pre-existing on a clean checkout.

Fixes #11423.
