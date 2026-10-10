Closes #8158

`leastRequests` kept every earlier candidate when it found a host with fewer active requests. So once no host was idle, `random_choose` chose at random between the most and the least loaded hosts. It now starts the candidate list over when it finds a strictly smaller count, and only adds hosts that tie with the best count.

Test: `TestLeastRequestsAllBusy` gives three hosts 30, 1 and 20 active requests and expects the host with 1 every time. Without the change it returns the host with 30 about half the time; with it, always the host with 1. `go test ./...` passes.

Manual check with the Caddyfile from the issue (slow and fast backend, 80 requests): v2.11.7 sent 39 to the slow one and 41 to the fast one. With the change it sent 10 and 70, about the same as `least_conn` (11 and 69).

## Assistance Disclosure

Claude Code (Claude Opus) helped write this patch and its test. I reviewed every line, and I ran the test before and after the change and the manual check above myself.
