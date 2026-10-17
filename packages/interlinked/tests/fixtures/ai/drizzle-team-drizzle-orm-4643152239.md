The `AbortController` + `signal` part closes the `onEnd` and `onError` leaks cleanly — that's the bulk of the listener accumulation.

One residual gap on the final iteration: when the loop exits via the `break` path (`onEnd` wins the last `Promise.race`, row resolves to `undefined`/empty) or via `throw` (`onError` wins), execution jumps straight to `finally` without re-entering the top of the loop. At that point `dataResolve` still holds the `stream.once('data', resolve)` from the last iteration. That listener was registered with no `signal`, so `ac.abort()` doesn't touch it, and the finally block only removes the permanent `dataListener`. So exactly one ``'data'`` listener leaks per ``iterator()`` call — ``MaxListenersExceededWarning`` will still accumulate, just at roughly one-third the original rate.

Mirroring the per-iteration cleanup pattern into ``finally`` should close it:

```ts
} finally {
    ac.abort();
    stream.off('data', dataListener);
    if (dataResolve) {
        stream.off('data', dataResolve);
    }
    if (isPool(client)) {
        conn.end();
    }
}
```

Same change in both `mysql2/session.ts` (~line 202) and `singlestore/session.ts` (~line 201).

Happy to send a follow-up PR with this plus a unit-level reproduction that pins `listenerCount` on a mocked EventEmitter stream.
