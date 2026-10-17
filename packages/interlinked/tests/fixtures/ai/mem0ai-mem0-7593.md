## Linked Issue

Closes #7592

## Description

This is a draft so the issue and implementation can be discussed together. It will stay a draft until the linked issue is accepted and the author checklist is complete.

Concurrent calls on the same OSS `Memory` instance can bypass an in-flight initialization retry after a transient startup failure. This PR makes every caller wait for the current shared initialization Promise, including callers that observe the previous error flag already cleared by another request.

The concrete trigger is embedding-dimension auto-detection failing during construction, followed by two overlapping `get()` calls while the provider is recovering. On SDK 3.3.1 at baseline [`b7ad69a`](https://github.com/mem0ai/mem0/tree/b7ad69afda6b6ed030347c66d48a13e4de9dec08), the first call waits for recovery and the second can reject with `TypeError: Cannot read properties of undefined (reading 'get')`. After this change, both calls wait and return their normal lookup results when initialization succeeds. If the shared retry fails, both receive the initialization error instead of a premature store-access error.

### Why the existing gate returns too early

Construction starts `_autoInitialize()` and stores its Promise in `_initPromise`. If initialization fails, the catch handler retains the error in `_initError`. This makes a later public method eligible to retry automatically through `_ensureInitialized()`.

The [baseline gate](https://github.com/mem0ai/mem0/blob/b7ad69afda6b6ed030347c66d48a13e4de9dec08/mem0-ts/src/oss/src/memory/index.ts#L294-L317) first awaited `_initPromise`, then used `_initError` to decide whether to start a retry. Its await of the replacement Promise and its retry-error check were both inside that conditional. That worked for a single caller, but the condition also decided whether a second caller waited at all.

The reproduced sequence is:

1. Two public calls begin after the failed constructor initialization has settled. Both await the same completed startup Promise.
2. The first caller resumes, sees `_initError`, clears the flag, replaces `_initPromise` with a recovery attempt, and awaits that attempt inside the conditional branch.
3. The second caller resumes from the original startup Promise. It sees the cleared flag and skips the entire branch.
4. The second caller returns from `_ensureInitialized()` although the replacement Promise is still pending.
5. Its public `get()` method accesses `this.vectorStore`. When the dimension probe has not completed, the store has not been created yet, so that access produces `undefined.get`.

The flag transition establishes that another caller has started recovery. It cannot establish that recovery has completed. This matters for a service that shares one `Memory` instance between requests: a short provider outage can leave concurrent requests taking different initialization paths even though they belong to the same instance.

### Implementation

The production change is confined to `mem0-ts/src/oss/src/memory/index.ts`. The conditional still decides which caller creates the automatic retry. The existing Promise assignment, error normalization, and logging stay in place. The await of `this._initPromise` and the subsequent `_initError` check now execute after that conditional.

Consequently, a caller that did not initiate recovery still awaits the replacement shared Promise before leaving the gate. After that Promise completes, the caller either proceeds through the existing public method or propagates the retained initialization error.

The change adds no retry strategy, delay, timeout, backoff, lock, provider behavior, or configuration option. It also does not move the fix into individual public methods. Those methods already share this gate, so correcting the gate preserves the existing initialization contract in one location without changing their signatures.

The only other changed file is [`mem0-ts/src/oss/tests/memory.init-retry.test.ts`](https://github.com/dakjdakd/mem0/blob/dbf763337e54d4481dd10691fc1206d688b63fee/mem0-ts/src/oss/tests/memory.init-retry.test.ts). It provides three native Jest regressions using the production constructor and public `get()` method. External provider factories and telemetry/notice persistence are mocked, while configuration merging, constructor initialization, shared retry coordination, and public lookup behavior execute normally. The [prepared diff](https://github.com/dakjdakd/mem0/compare/b7ad69afda6b6ed030347c66d48a13e4de9dec08...dbf763337e54d4481dd10691fc1206d688b63fee) contains only this fixture and the shared-gate correction.

## Type of Change

- [x] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Refactor (no functional changes)
- [ ] Documentation update

## AI Assistance

- [ ] No AI assistance
- [ ] AI-assisted (autocomplete, or I asked a model questions while writing this)
- [x] AI-generated (an agent wrote most or all of this diff)

Codex found and reproduced the bug and wrote the patch and regression tests.

- [ ] **I can explain every line of this diff and how it interacts with the rest of the codebase, without asking an AI tool.**

## Breaking Changes

N/A. Public signatures and configuration remain unchanged.

## Test Coverage

- [x] I added/updated unit tests
- [ ] I added/updated integration tests
- [ ] I tested manually (describe below)
- [ ] No tests needed (explain why)

### Regression cases

Three focused cases pass:

- **Shared recovery succeeds.** The first dimension probe rejects, the retry probe waits on a deferred Promise, and two public lookups start together. No store read happens before recovery. Both resolve to `null` for missing IDs, with two total probes and one vector-store creation.
- **Shared recovery fails.** The retry probe rejects with `provider still unavailable`. Both public lookups reject with the dimension-detection initialization error containing that detail. No vector store is created and no read is attempted.
- **Normal startup succeeds.** The initial probe is deferred while two lookups start. Both wait, then resolve normally after startup is released. There is one probe, one store creation, and one initialization, so the change does not introduce a retry on ordinary startup.

The deferred responses and `setImmediate` event-loop turns make the overlap explicit; the fixture does not depend on a live outage or a guessed sleep duration.

### Commands and results

Commands were executed from `mem0-ts` using the repository Jest configuration and pnpm 10:

```sh
pnpm dlx pnpm@10.32.1 exec jest --runInBand src/oss/tests/memory.init-retry.test.ts
```

Result after the fix: **1 suite, 3 tests passed**.

The relevant supported initialization and dimension checks were selected explicitly:

```sh
pnpm dlx pnpm@10.32.1 exec jest --runInBand \
  src/oss/tests/memory.init-retry.test.ts \
  src/oss/tests/dimension-autodetect.test.ts \
  src/oss/tests/memory.init.test.ts \
  --testNamePattern 'Memory initialization retries|Memory - |ConfigManager|Memory . auto-initialization'
```

Result: **3 suites, 22 tests passed; 7 separate vector-store backward-compatibility cases were not selected**. This includes existing dimension resolution, startup waits, explicit dimensions, initialization errors, constructor behavior, and reset checks.

Formatting was checked for both changed files:

```sh
pnpm dlx pnpm@10.32.1 exec prettier --check \
  src/oss/tests/memory.init-retry.test.ts \
  src/oss/src/memory/index.ts
```

Result: **passed**. A focused `tsc --noEmit` check including the changed source, regression fixture, their transitive imports, and the package's existing `global.d.ts` also passed.

The package's existing tsup configuration was run directly, without custom build arguments:

```sh
pnpm dlx pnpm@10.32.1 exec tsup
```

Result: **passed**, producing client and OSS CJS/ESM bundles and both DTS builds. `git diff --check` also passed. Package manifests and lockfiles are unchanged.

Validation ran on Windows with Node 24.11.1. The new regressions require no embedding, LLM, or external vector-service credentials. The existing initialization checks used native SQLite after rebuilding that dependency.

## Checklist

- [x] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [x] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally
- [x] I have updated documentation if needed

The public API is unchanged, so no documentation update is required.
