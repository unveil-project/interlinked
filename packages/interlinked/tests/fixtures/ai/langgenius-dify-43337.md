## Summary

Fixes #40595.

Annotation reply jobs (enable/disable) were guarded by a Redis key that was never written, so concurrent clicks could enqueue duplicate jobs for the same app. Enable and disable also used separate keys, so they could overlap each other. And when a task exited early (app deleted, or annotation setting missing), it never wrote a terminal job status and never released the key, leaving the job stuck at "waiting" in the UI.

## What changed

- `api/services/annotation_service.py`: enable and disable now reserve one shared key per app (`app_annotation_job_{app_id}`) with an atomic `SET NX EX 600` holding the job id. A concurrent caller reuses the in-flight job instead of enqueueing a duplicate. The per-job status key is also written with an expiry now, so a crashed worker cannot leave it stuck at "waiting" forever, and the reservation is released if enqueueing fails.
- `api/tasks/annotation/enable_annotation_reply_task.py` and `disable_annotation_reply_task.py`: the early exits (app not found / setting not found) now mark the job `completed` and release the reservation. The task deletes the same reservation key the service writes (previously it deleted keys the service never set).
- `api/tests/unit_tests/services/test_annotation_service.py`: added regression tests for duplicate enable calls, enable/disable overlap in both directions, and terminal status plus reservation release on early task exits. Updated two existing tests for the new Redis call shapes.

## Testing

Ran `tests/unit_tests/services/test_annotation_service.py`: 53 passed. The 7 new/updated tests fail against the pre-fix code (verified via stash) and pass after it.
