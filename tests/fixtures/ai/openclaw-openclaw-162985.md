## Summary
- Normal Talk consult completion closed run admission in `finally` without joining tracked terminal writes.
- A pending accepted write then failed owner checks with `Terminal write owner changed before commit`.
- Abort still closes immediately. A finished consult now drains accepted writes before close, matching the ordinary agent runner.
- Follow-up: abort listener stays registered **through** drain. Cancel mid-settlement revokes admission before a delayed commit.

Fixes #162908

## Test plan
- [x] `./node_modules/.bin/vitest run src/gateway/talk/client-agent-consult.admission.test.ts src/gateway/talk/client-gateway-control.agent-consult.test.ts` — **28 passed** (6.48s)
- Finished consult stays open until the tracked write settles, then closes
- Abort before drain closes without waiting for a pending write
- Abort **during** drain: listener still registered; `close()` runs; `assertCurrent()` throws `Terminal write owner changed before commit` before the delayed write can land

## After-fix proof (redacted)

Normal completion (helper): tracked write remains pending → admission stays open → write settles → `close()`.

Abort during drain (helper + Talk runner):
```
settleTalkConsultAdmission({ aborted: false, ... })  # drain starts
controller.abort()                                    # listener still registered
expect(closed).toBe(true)
expect(() => captured.assertCurrent()).toThrow(/Terminal write owner changed before commit/)
release.resolve()                                     # delayed write cannot commit
```

Talk runner: core finishes with a tracked pending write; abort while drain awaits; `mocks.close` called once **before** the write promise resolves.

Head: `7b040fbc3b3`
