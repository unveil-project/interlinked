### The kind of change this PR does introduce

* [x] a bug fix
* [ ] a new feature
* [ ] an update to the documentation
* [ ] a code change that improves performance
* [ ] other

### Current behavior

With the `retries` option, `emit()` hands the packet to `_addToQueue()`, which copies `this.flags` into the queued packet but never clears them. `emit()` then returns early, so the usual `this.flags = {}` at the end is skipped. The flags are only reset when `_drainQueue()` happens to send something right away, which does not happen when the socket is not connected yet or when an earlier packet is still waiting for its ack.

In that case a one-shot modifier like `compress(false)` or `timeout()` sticks to every following emit:

```js
const socket = io({ autoConnect: false, retries: 3, ackTimeout: 10000 });

socket.timeout(100).emit("a", () => {});
socket.emit("b", () => {});
socket.emit("c", () => {});

// queued flags:
// a: { fromQueue: true, timeout: 100 }
// b: { fromQueue: true, timeout: 100 }   <- should use ackTimeout
// c: { fromQueue: true, timeout: 100 }
```

Same thing once connected, if `socket.compress(false).emit("x")` is called while another packet is pending: the next `emit()` is sent uncompressed too.

### New behavior

The flags are cleared once they have been copied into the queued packet, so they only apply to that packet (including its retries), like they do without `retries`.

### Other information (e.g. related issues)

I could not find an existing issue for this.

Two tests added to `test/retry.ts`, one for the "not connected yet" case and one for the "previous packet pending" case. They check the `compress` option of each packet on `packetCreate`. Without the change they fail with `expected [ false, false ] to sort of equal [ false, true ]` and `expected [ true, false, false ] to sort of equal [ true, false, true ]`. `npm test --workspace=socket.io-client` passes (114 tests).
