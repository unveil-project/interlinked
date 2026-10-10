`app.listen(cb)` registers `cb` as a one-off `'error'` listener so that errors
raised while binding (such as `EADDRINUSE`) are delivered to the callback, but
that listener is never removed. After a successful start the server still
carries it, and since it has already been called it does nothing — it consumes
the first later `'error'` event instead of letting it keep the normal
`EventEmitter` semantics.

Remove the listener from the `'listening'` event, which fires before the user
callback runs. Errors raised while binding are emitted before `'listening'`, so
they still reach the callback.

The new tests assert that no `'error'` listener is left behind and that a later
`emit('error')` is no longer swallowed.
