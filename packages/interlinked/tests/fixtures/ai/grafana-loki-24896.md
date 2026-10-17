Ran into #24206 while looking through S3-compatible storage reports. The trailer corruption itself got fixed by pre-computing the SHA-256 (#22003, already backported to 3.6.16/3.7.7), but the second half of that issue is still open: there is no way to turn the checksum off. Every PutObject gets a SHA-256 attached whether the bucket needs it or not, and on backends that mishandle checksum headers (OTC/Huawei OBS was the reported one) the only outs right now are pinning to an old release or moving to `use_thanos_objstore: true`.

This adds `storage_config.aws.checksum_algorithm` with two values, `sha256` (default, current behavior) and `none`. With `none` the client skips the pre-computed SHA-256 entirely, which also saves a full read of the body, and sets `RequestChecksumCalculation` to `when_required` so the SDK doesn't quietly re-attach a CRC32 on its own. That last part is easy to miss: just leaving `ChecksumAlgorithm` unset isn't enough, because the SDK's default policy still adds one.

`none` isn't guarded against Object Lock buckets or anything fancy like that. Object Lock needs the checksum, which the flag help text says. Empty string behaves exactly as before (sha256), so existing configs are unaffected.

Tests: new cases covering the built PutObjectInput for each setting, a wire-level test asserting no checksum headers and a byte-identical body under `none`, config validation, and the SDK options func. Ran `go test ./pkg/storage/chunk/client/aws/` (all green), `go vet`, and regenerated the config reference with `make doc`.

Closes #24206.
