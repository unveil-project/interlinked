Fixes #61906

### Summary
When using the `phpredis` extension, commands or Lua scripts that fail with a Redis server error (such as `ERR ACL failure in script: User ... has no permissions to run the '...' command`) return `false` without throwing a `RedisException`. The error string is instead populated in `Redis::getLastError()`.

Because `PhpRedisConnection::command()` did not inspect `getLastError()`, failed commands and Lua script calls (used by `RedisQueue::push()`, `later()`, `pop()`, etc.) would silently return `false`:
- Jobs dispatched with missing Redis ACL permissions silently failed to queue without raising an exception or reporting the error.
- Queue workers polling queues with missing permissions would receive `null` from `pop()` and sleep silently as if the queue were empty.

### Solution
- In `PhpRedisConnection::command()`, check if the command returned `false` and `getLastError()` returned a non-null error string.
- If an error is detected, clear the last error on the client, dispatch the `CommandFailed` event, and throw a `RedisException` containing the server error message.
- Added test coverage in `RedisEventsTest`.