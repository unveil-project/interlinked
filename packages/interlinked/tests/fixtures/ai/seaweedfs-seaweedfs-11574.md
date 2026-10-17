## Problem
When \iler.sync\ or \iler.remote.sync\ processes metadata changes asynchronously using \MetadataProcessor\, the gRPC subscription stream in \makeSubscribeMetadataFunc\ unconditionally updated \option.StartTsNs = resp.TsNs\ on each incoming response off the wire.

If the gRPC connection drops or encounters a transient network error while asynchronous transfers or retries are still in flight or failing, \FollowMetadata\ retries subscription using \option.StartTsNs\, which was already advanced to the latest received envelope timestamp. This caused events that were still in flight or failed during the network interruption to be skipped permanently on reconnection. Additionally, for synchronous handlers that return an error, \StartTsNs\ was previously advanced past the failed event.

## Fix
1. Added \GetResumeTsNs\ func to \MetadataFollowOption\ so asynchronous consumers can provide dynamic lookup of the durable processed watermark (\processor.processedTsWatermark.Load()\).
2. In \makeSubscribeMetadataFunc\, use \GetResumeTsNs()\ when available on subscribe and avoid prematurely mutating \StartTsNs\ on receive.
3. Configured \GetResumeTsNs\ in \iler.sync\ and \iler.remote.sync\ to preserve the real processed watermark across subscription reconnections.
4. For synchronous subscribers, prevented advancing \StartTsNs\ when \processEventFn\ returns an error.

## Tests
- \TestFilerSyncResumeFromProcessedWatermarkOnReconnect\ in \weed/pb/filer_pb_tail_test.go\
- \TestFilerSyncDoesNotAdvanceStartTsNsOnProcessError\ in \weed/pb/filer_pb_tail_test.go\
- \TestFilerSyncOffsetStaysFreshOnFilteredMarker\ in \weed/pb/filer_pb_tail_test.go\
- \TestFilerSyncBatchedFreshnessSignalDoesNotCrash\ in \weed/pb/filer_pb_tail_test.go\
- \TestMetadataProcessorEmptyMarkerKeepsWatermarkStale\ in \weed/command/filer_sync_jobs_test.go\
- Verified clean compilation and tests inside \golang:1.26-bookworm\ container.

Fixes #11565
<!-- devin-review-badge-begin -->

---

<a href="https://app.devin.ai/review/seaweedfs/seaweedfs/pull/11574" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-devin-review-dark.svg?v=4"><img src="https://static.devin.ai/assets/gh-devin-review-light.svg?v=4" alt="Devin Review"></picture></a>
<!-- devin-review-badge-end -->

<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **Bug Fixes**
  * Resumed metadata syncs now continue from the last successfully processed update, helping prevent missed changes after a connection interruption.
  * Failed updates no longer advance the sync position, allowing them to be retried instead of skipped.
  * Sync progress markers now advance the recorded position when processing is idle, without moving past active work or an unresolved failure.
  * Peer-reported gRPC cancellation errors are now treated as transient and can be retried.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->
