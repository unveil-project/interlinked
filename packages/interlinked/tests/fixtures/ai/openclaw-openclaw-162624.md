Related: #162497

## What Problem This Solves

Fixes: a full SQLite worker store ("capacity reached") is treated as a provider overload, so every model fallback is tried and fails.

## User Impact

User impact: the run stops on the first model and no longer blames the model provider.

## Why This Change Was Made

`SqliteWorkerError` is now local coordination, like the other runner errors, and no longer yields a provider failover reason. The 64-store limit itself is not changed here.

## Evidence

Same error through the real classifiers, before and after:

```
before: resolution failover      facts {"reason":"overloaded","code":"overloaded"}
after:  resolution coordination  facts {"code":"overloaded"}
```

Both new tests fail without the fix and pass with it. `failover-error.test.ts`, `model-fallback.terminal-boundary.test.ts`, `model-fallback.test.ts`, `model-fallback.chain-stop.test.ts` pass. New tests run in 5 to 6 ms each (`--maxWorkers=1`, 43s cold transform). `oxlint` and `oxfmt` clean.
