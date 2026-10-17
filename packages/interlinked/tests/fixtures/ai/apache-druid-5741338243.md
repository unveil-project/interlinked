@FrankChen021 Fair question, and the honest answer is that the motivation is the client's error-handling contract, not a deployment I am running.

`DirectDruidClient` currently assumes any non-2xx body it is handed is JSON. When it is not — and a 429 or 503 from anything sitting in the path is the realistic way that happens — the failure surfaces as a Jackson parse error against HTML, which tells the operator nothing about what actually went wrong. The capacity signal that Druid already models as `QueryCapacityExceededException` is lost, and what reaches the logs is a deserialization stack trace pointing at `<html>`.

So the bug I am fixing is that the client mis-reports a knowable condition, and that is true independent of who put the 429 there. A proxy is the easiest way to produce one, which is why the reproducer uses one, but it is not the premise of the fix — `failIfNonJsonBody` detects a non-JSON body regardless of status, so a bare intermediary, a load balancer health gate, or a future Druid path that returns a non-JSON error body all land in the same branch instead of the parse failure.

If your view is that Druid should only harden this once someone reports it from a real cluster, that is a reasonable line to hold and I will not argue it. I would rather you close it on that basis than merge it on an implication I have a production topology behind it, because I do not.
