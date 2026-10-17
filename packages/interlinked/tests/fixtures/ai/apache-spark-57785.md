In python/pyspark/sql/connect/client/reattach.py, SparkConnectClient
stores the gRPC metadata as-is:

    self._metadata = metadata

If the caller passes a one-shot iterable (e.g. a generator or an
iterator) rather than a list/tuple, this metadata gets consumed the
first time it's iterated. Since the same self._metadata is reused
across multiple RPCs on the same client (ReattachExecute,
ReleaseExecute, and retries of ExecutePlan), any RPC after the first
would silently send empty metadata, which would drop auth-related
headers (e.g. bearer tokens) on those subsequent calls without any
visible error.

This doesn't currently cause a problem for callers that already pass
a list/tuple for metadata, since those remain safely re-iterable.
But it's a latent correctness/robustness issue: nothing enforces that
metadata is passed as a re-iterable type, and the failure mode
(silently missing headers) is easy to miss in testing.

Proposed fix: convert metadata to a list at assignment time
(self._metadata = list(metadata)), so it is guaranteed to be
re-iterable across all RPCs regardless of what type of iterable is
passed in.

This is not an authentication bypass in itself; no existing caller
is currently affected, but it removes a class of accidental-metadata-
loss bugs that could otherwise mask missing auth headers on retry/
reattach paths.
