**What kind of change does this PR introduce?**

Feature.

**Did you add tests for your changes?**

Yes, in NodeWebSocketTransport.test.ts.

**If relevant, did you update the documentation?**

Yes, regenerated with `npm run docs`.

**Summary**

Add `maxPayload` to `WsOptions` so the 256MB limit on messages received from the browser can be raised. The default is unchanged.

`launch()` now also passes `wsOptions` to the WebSocket transport, which it previously ignored. As a result `keepAlive`, `keepAliveIntervalMs`, `headers` and `maxPayload` set through `launch()` now take effect for WebSocket launches.

This picks up where #14928 left off (it was closed as stale) with the changes asked for there: docs regenerated, the option goes through `WsOptions`, and the test has its own `describe` block that opens its own transport.

Fixes #14012

**Does this PR introduce a breaking change?**

No.

I used AI help on this and reviewed it myself.
