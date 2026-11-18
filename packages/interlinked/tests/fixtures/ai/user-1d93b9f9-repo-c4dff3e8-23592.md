## Bug summary

Separate follow-up to the [maintainer request on #23375](https://github.com/PrefectHQ/prefect/pull/23375#discussion_r4367696088), not a competing fix for that PR.

With an async-generator task, `retries=1`, and a finalizer that raises, closing the generator after its first item restarts the task body. The first `aclose()` raises `RuntimeError: async generator ignored GeneratorExit`. This can repeat side effects at the start of a task even though its consumer is explicitly closing it.

I reproduced the following in the repository test harness on Python 3.12, against PR head `b0becfad0d429a5211586a3f21ae4aebb7b9a8a2`. Save this as a test under `tests/` so the repository's isolated API fixtures apply:

```python
import pytest
from prefect import task
from prefect.client.orchestration import PrefectClient
from prefect.context import TaskRunContext

async def test_task_finalizer_retry_on_close(prefect_client: PrefectClient):
    starts = []
    cleanups = []

    @task(retries=1)
    async def generator():
        starts.append("start")
        try:
            yield 1
            yield 2
        finally:
            cleanups.append(TaskRunContext.get() is not None)
            raise ValueError("cleanup failed")

    gen = generator()
    assert await anext(gen) == 1
    try:
        with pytest.raises(RuntimeError, match="^async generator ignored GeneratorExit$"):
            await gen.aclose()
        # Characterizes the bug, not the desired behavior:
        assert starts == ["start", "start"]
        assert cleanups == [True]
    finally:
        # Disposal only; observations above are from the first close.
        try:
            await gen.aclose()
        except (RuntimeError, StopAsyncIteration):
            pass
```

Relevant observed output before disposal:

```text
Task run failed with exception: ValueError('cleanup failed') - Retry 1/1 will start immediately
RuntimeError: async generator ignored GeneratorExit
starts=['start', 'start']; cleanups=[True]
```

Expected scope: explicitly closing the task generator should not start its body again. I am not proposing transaction/rollback changes or choosing final-state semantics here.

## Version info and verification boundaries

- PR head: `b0becfad0d429a5211586a3f21ae4aebb7b9a8a2`; Linux, Python 3.12; repository SQLite/API fixtures.
- Local characterization plus the two successful-cleanup retry controls: **3 passed**. The characterization intentionally expects the buggy outcome; this is not a passing fix or clean teardown. The subsequent disposal also emitted async-generator/context cleanup errors.
- Substituting only `task_engine.py` from base `e9bc08239af12f2bbfccab7a8e15b9f0a0ec6865` also reproduced two starts and the same first-close RuntimeError. On base, the retry is triggered by the existing `AttributeError: 'async_generator' object has no attribute 'throw'`, and the first-close cleanup list is empty. This is not evidence that base executed the same finalizer path as the PR.
- Current main `21a1f025480406046668edf22705234ce6b1c31f` has the same `run_generator_task_async` function as that tested base version; I have not run the full current-main checkout.
- No production fix, full suite, remote CI for new tests, final task-state guarantee, or transaction-semantics claim.

AI assistance: Codex prepared and executed these reproductions and independently reviewed the characterization and evidence. No production code change is proposed in this report.
