## TLDR

Problem this solves:

- Failed flushes silently discard adaptive routing feedback
- Cancelled batches lose unfinished writes
- Overlapping local flushes can overwrite newer session snapshots
- Flush counts include failed writes

How it solves it:

- Restore unacknowledged rows after failure or cancellation
- Merge learning deltas and preserve newer queued snapshots
- Serialize flushes for each queue within one process
- Count acknowledged writes and update recovery metrics
- Bound failed session retention and reject invalid database keys

## User Flow

Before: feedback collected during a database write failure disappears from persistence

1. An operator runs an adaptive router with database persistence
2. Requests generate routing feedback while the database is temporarily unavailable
3. Database access recovers, but failed feedback is no longer queued
4. After restart, those observations are missing from the router's learning state

After: unacknowledged feedback is retried within the session retention limit

1. An operator runs an adaptive router with database persistence
2. Requests generate routing feedback while the database is temporarily unavailable
3. Database access recovers, and the next flush retries queued feedback
4. After restart, acknowledged observations are loaded from persisted learning state

## Pre-Submission checklist

- [x] I have added meaningful tests
- [x] The handful of test files covering my change pass locally
- [x] My PR passes all required CI/CD checks
- [x] My PR's scope is as isolated as possible; it only solves one specific problem
- [ ] I have received a Greptile Confidence Score of at least 4/5 before requesting a maintainer review

Linux Python 3.12.3: `pytest tests/unit/router_strategy/adaptive_router -q --tb=short --timeout=40` passes 179 tests. The queue's 96 executable statements are all covered. The original 21 queue cases fail on the original base with 12 failures and 9 passes. Six review-fix cases additionally fail on the pre-retention tip 62b23f95ac (6 failed, 22 passed); all 28 queue cases pass with the final patch

Source and test Ruff checks, formatting, strict Ruff, type-discipline and test-quality gates, MCP operation boundary, circular-import and import-safety checks passed locally. The canonical full type-budget gate passes without budget edits; it tolerates existing repository diagnostics. The changed source file separately passes basedpyright with zero diagnostics. The end-to-end test type check reports zero diagnostics across 258 files. Current tip 546984a2b2 is rebased onto main at 5ccb1a143b, which contains the upstream fix for the migration timeout fixture. Local validation on this tip passes 179 adaptive-router tests with 100% queue line coverage, all 42 Prisma toolchain tests, Ruff, formatting, the updated type-discipline gate, and fresh live PostgreSQL before/after proof. Obsolete mutable-ok comments were removed to comply with the updated suppression checker. Hosted CI is complete on this tip: 98 checks passed, zero failed, and one expected changed-E2E job skipped. All branch-required checks and schema-migration pass. Codecov reports 100% patch coverage. Earlier bot reviews refer to a prior tip; the retention and invalid-key findings are addressed by the final changes and fresh tests/proof.

Earlier targeted manual semantic mutations that remove state recovery, reverse snapshot merge order, remove session serialization, or count failed writes are each detected by the regression tests

## Screenshots / Proof of Fix

Captured against PostgreSQL 16.15, using the schema deployed by `prisma db push --schema schema.prisma --skip-generate`. The complete persistence path uses the real `AdaptiveRouterUpdateQueue`, LiteLLM repositories, `PrismaClient`/`PrismaWrapper`, generated Prisma client and PostgreSQL. No mocks, monkeypatches, or fake database responses. This is database persistence work; no provider-facing behavior changes or paid LLM calls are involved in these cases.

Shared setup: create an isolated local database on port 55439 with owner `proof_admin`; create non-owner login `proof_writer`; grant schema usage and SELECT/INSERT/UPDATE/DELETE on the tables. The reproduction temporarily revokes INSERT/UPDATE to cause genuine database write failures, restores those privileges, and retries the same queue. It independently reads the final rows with psycopg. Run only against a disposable local database.

### Before (5ccb1a143b759a83752ccb350a7031c596b9dec4)

#### State feedback after write access recovers

1. In a clean checkout of the merge base, run `PYTHONPATH="$PWD" python live-proof.py > live-before.log 2>&1` using the script below.
2. The state case reports `failed_flush_count=1`, `pending_after_failure=0`, `retry_count=0`, and `persisted_row=null`. The failed update is gone, and the reported success count is wrong.

#### Session snapshot after write access recovers

1. Run the session case in the same captured command.
2. The session case reports `failed_flush_count=1`, `pending_after_failure=0`, `retry_count=0`, and `persisted_row=null`. The session snapshot is gone.

#### Failed session retention limit

1. The same script enqueues 1,025 session snapshots, revokes database write access, flushes, restores access, and retries.
2. Before: `failed_flush_count=1025`, `pending_after_failure=0`, `retry_count=0`, and persisted row count is zero. All failed snapshots are discarded.

#### Invalid database key

1. The same script submits a session key PostgreSQL cannot store in a text column.
2. Before: `pending_before_failure=1`, followed by a genuine database error and an incorrectly reported successful write.

### After (546984a2b219c3cafd15e4dc0f4217f28d276a34)

#### State feedback after write access recovers

1. In a clean checkout of this PR's tip, run the same command, writing `live-after.log`.
2. The state case reports `failed_flush_count=0`, `pending_after_failure=1`, `retry_count=1`, `pending_after_recovery=0`, and `persisted_row=[2.0, 1.0, 1]` (alpha, beta, total_samples).

#### Session snapshot after write access recovers

1. Run the session case in the same captured command.
2. The session case reports `failed_flush_count=0`, `pending_after_failure=1`, `retry_count=1`, `pending_after_recovery=0`, and `persisted_row=["proof-session", 1]` (session_id, turn_count).

#### Failed session retention limit

1. Run the same script at this PR's current tip.
2. After: `failed_flush_count=0`, `pending_after_failure=1024`, `retry_count=1024`, and persisted row count is 1,024, from `s-0001` through `s-1024`. The oldest snapshot is deliberately dropped.

#### Invalid database key

1. Run the same invalid-key case at this PR's current tip.
2. After: `pending_before_failure=0`, `failed_flush_count=0`, `retry_count=0`, and persisted row count is zero. The invalid key is not enqueued.

<details>
<summary>Reproduction script: live-proof.py</summary>

```python
import asyncio
import json
import os
import subprocess

import psycopg

from litellm.proxy.common_utils.user_api_key_cache import UserApiKeyCache
from litellm.proxy.utils import PrismaClient, ProxyLogging
from litellm.router_strategy.adaptive_router.update_queue import AdaptiveRouterUpdateQueue

ADMIN = "postgresql://proof_admin@127.0.0.1:55439/proof"
TABLES = '"LiteLLM_AdaptiveRouterState", "LiteLLM_AdaptiveRouterSession"'


def sql(statement):
    with psycopg.connect(ADMIN, autocommit=True) as connection:
        connection.execute(statement)


async def main():
    os.environ["DATABASE_URL"] = "postgresql://proof_writer@127.0.0.1:55439/proof"
    client = PrismaClient(os.environ["DATABASE_URL"], ProxyLogging(UserApiKeyCache()))
    await client.db.connect()
    print("HEAD", subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip())
    try:
        for case in ("state", "session", "session_limit", "invalid_key"):
            sql(f"TRUNCATE {TABLES}")
            sql(f"GRANT INSERT, UPDATE ON {TABLES} TO proof_writer")
            queue = AdaptiveRouterUpdateQueue()
            if case == "state":
                await queue.add_state_delta("proof", "coding", "model", 2.0, 1.0)
                flush = queue.flush_state_to_db
            elif case == "session":
                await queue.add_session_state(
                    "proof-session", "proof", "model",
                    {"classified_type": "coding", "turn_count": 1},
                )
                flush = queue.flush_session_to_db
            elif case == "session_limit":
                for index in range(1025):
                    await queue.add_session_state(
                        f"s-{index:04}", "proof", "model",
                        {"classified_type": "coding", "turn_count": 1},
                    )
                flush = queue.flush_session_to_db
            else:
                await queue.add_session_state(
                    "invalid\0key", "proof", "model",
                    {"classified_type": "coding", "turn_count": 1},
                )
                flush = queue.flush_session_to_db
            kind = "state" if case == "state" else "session"
            before_failure = await queue.queue_size()
            sql(f"REVOKE INSERT, UPDATE ON {TABLES} FROM proof_writer")
            failed_count = await flush(client)
            after_failure = await queue.queue_size()
            sql(f"GRANT INSERT, UPDATE ON {TABLES} TO proof_writer")
            retry_count = await flush(client)
            after_recovery = await queue.queue_size()
            with psycopg.connect(ADMIN) as connection:
                if case == "state":
                    row = connection.execute(
                        'SELECT alpha, beta, total_samples FROM "LiteLLM_AdaptiveRouterState"'
                    ).fetchone()
                elif case == "session":
                    row = connection.execute(
                        'SELECT session_id, turn_count FROM "LiteLLM_AdaptiveRouterSession"'
                    ).fetchone()
                else:
                    row = connection.execute(
                        'SELECT count(*), min(session_id), max(session_id) FROM "LiteLLM_AdaptiveRouterSession"'
                    ).fetchone()
            print(json.dumps({
                "case": case, "failed_flush_count": failed_count,
                "pending_before_failure": before_failure[f"{kind}_pending"],
                "pending_after_failure": after_failure[f"{kind}_pending"],
                "retry_count": retry_count,
                "pending_after_recovery": after_recovery[f"{kind}_pending"],
                "persisted_row": row,
            }, sort_keys=True), flush=True)
    finally:
        sql(f"GRANT INSERT, UPDATE ON {TABLES} TO proof_writer")
        await client.db.disconnect()


asyncio.run(main())

```

</details>

## Type

Bug Fix

## Caveats (if any)

### Medium

- Ambiguous committed state writes can be counted twice
- Failed session retention keeps at most 1,024 entries
- Overflow discards older snapshots; invalid database keys are dropped
- Process termination can still lose pending updates
- Session ordering guarantees apply to completed local flushes

### Low

- Provider calls are outside this persistence-only proof
- Automated bot reviews still refer to a prior tip

Retrying is explicitly at-least-once. If a state increment commits but its acknowledgment is lost, the next flush cannot distinguish it from a failed write. Durable idempotency is outside this queue-local change. The session limit bounds entries retained after failed or cancelled restoration; it does not bound snapshot bytes, transient allocations, or arrivals while a flush is in flight. Successful flushes do not impose the failed-retention cap on newly queued rows

This PR is ready for review. The final attestation remains unchecked for contributor review.

## Final Attestation

- [ ] The tests check the right things, including the edge cases, and regressions in the respective real-world customer use-cases are not possible after this PR
