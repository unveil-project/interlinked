Fixes #11615

# What problem are we solving?

When `backend.OpenVolumeFile` fails during volume load (for example when the disk is below `-minFreeSpace`), it returns a nil `*os.File`. `backend.NewDiskFile(dataFile)` ran before the error check, so it panicked on `f.Stat()` and the volume server crash-looped at startup.

# How are we solving the problem?

Check the error right after `OpenVolumeFile` and before `NewDiskFile`, returning the same error messages the existing check already uses. The later check is left in place for the `CreateVolumeFile` path. No other logic changes.

# How is the PR tested?

New unit test `TestLoad_DatOpenFail_NoNilPanic` in `weed/storage/volume_loading_open_fail_test.go` creates a volume, replaces its `.dat` file with a directory so the open fails (even as root), and asserts `NewVolume` returns an error. It panics on current master and passes with the fix. `gofmt`, `go vet ./weed/storage/...`, `go test ./weed/storage/...` and `go test ./weed/storage/backend/...` pass.

# Checks
- [x] I have added unit tests if possible.
- [ ] I will add related wiki document changes and link to this PR after merging.
- [x] All AI code review comments have been addressed. No more comments to fix if reviewed again. Reviewer may request additional gemini and copilot reviews.

# Checks for AI generated PRs
- [x] I have reviewed every line of code.
- [x] The PR is kept as minimum as possible. Large PRs would not be accepted.

<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **Bug Fixes**
  * Volume loading now reports an error when the data file cannot be opened or created, including when a directory occupies its expected path.
  * Error messages now distinguish permission issues from other data-file loading failures.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->