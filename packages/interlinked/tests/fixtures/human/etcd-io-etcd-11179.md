Fix issue #11166.
This pr creates a standalone trace pkg for record the lifecycle of the request in etcd server. We only enable tracing for range request in this pr. Please refer to issue #11166 for the motivation of it.

Here is the example output of range request with no threshold:

> {"level":"info","ts":"2019-09-25T11:10:35.671-0700","caller":"traceutil/trace.go:116","msg":"trace[1475838163] range","detail":"{range_begin:foo; range_end:fooo; response_count:100000; response_revision:191496;}","duration":"131.11503ms","start":"2019-09-25T11:10:35.540-0700","end":"2019-09-25T11:10:35.671-0700","steps":["trace[1475838163] step 'agreement among raft nodes before linearized reading'  (duration: 56.363µs)","trace[1475838163] step 'authentication'  (duration: 7.283µs)","trace[1475838163] step 'range keys from in-memory index tree'  (duration: 10.166116ms)","trace[1475838163] step 'range keys from bolt db'  (duration: 91.280638ms)","trace[1475838163] step 'filter and sort the key-value pairs'  (duration: 22.58693ms)","trace[1475838163] step 'assemble the response'  (duration: 241.774µs)"]}


To avoid log flood, we choose to log out only when exceed the threshold. In this pr, we set the default threshold to 100ms which is as same as `warnApplyDuration`. Here is the example output with threshold:

> {"level":"info","ts":"2019-09-25T09:59:32.744-0700","caller":"traceutil/trace.go:116","msg":"trace[633331442] range","detail":"{range_begin:foo; range_end:fooo; response_count:100000; response_revision:191496;}","duration":"132.449773ms","start":"2019-09-25T09:59:32.611-0700","end":"2019-09-25T09:59:32.744-0700","steps":["trace[633331442] step 'range keys from bolt db'  (duration: 92.521911ms)","trace[633331442] step 'filter and sort the key-value pairs'  (duration: 22.789099ms)"]}


Some steps disappear because the duration of these steps are smaller than `stepThreshold` which is `threshold / (len(steps)+1)`.

As for performance, there is no obvious difference with and without trace when I run the benchmark with a range request of key count 100000.


