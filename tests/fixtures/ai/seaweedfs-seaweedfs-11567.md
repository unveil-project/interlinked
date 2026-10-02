# What problem are we solving?

`ensureEntryInode()` gives every new filer entry a persistent inode so the filer-stored value matches what a FUSE mount computes from the same path and creation time. It derives that inode from `HashStringToLong`, which is uniform over `int64`, so about half of the derived values end up above `math.MaxInt64` once converted to `uint64`:

```go
inode := uint64(HashStringToLong(string(fp)))   // signed hash, half of them negative
inode = inode + uint64(unixTime)*37              // uniform over the full uint64 range
```

The Elasticsearch filer store hands `filer.Entry` straight to `jsoniter.Marshal` and declares no mapping, so Elasticsearch dynamically indexes `Entry.Attr.Inode` as a `long`. A Go `uint64` above `9223372036854775807` is serialized as a plain positive JSON integer, the whole document is rejected with HTTP 400, and the filer keeps retrying the metadata entry that can never be written:

```
failed to parse field [Entry.Inode] of type [long]
Preview of field's value: '13400913224923985991'
[type=mapper_parsing_exception]
```

Measured over 20000 paths with a fixed creation time, 9967 of them (49.8%) exceeded `math.MaxInt64`.

# How are we solving the problem?

Fold the sign bit off at the derivation site, in one exported helper, `util.NormalizeInode`, and route both derivation sites through it:

- `FullPath.AsInode()` — path hash plus the creation-time term.
- the hard-link branch in `ensureEntryInode()` — `HardLinkId` hash, which has the same problem and no crtime term.

```go
func NormalizeInode(inode uint64) uint64 {
	return inode & math.MaxInt64
}
```

A few notes on the approach:

- **Masking, not reducing.** `inode & math.MaxInt64` keeps the remaining 63 bits of a uniform hash, so distinct paths still derive distinct inodes. Subtracting or taking a modulus would keep the same collision count while making the distribution harder to reason about.
- **One place, both consumers.** The change is in the shared derivation, so the FUSE mount and the filer keep agreeing on the value — which is the whole point of `ensureEntryInode`. Inodes from a live mount simply shift by one hash bit; the derivation already depends on the creation time.
- **No store-side clamping.** Clamping in the Elasticsearch store would make a stored inode differ from the value a mount computes for the same path, and every other store would stay exposed to the same failure.
- **No backfill needed.** Entries that failed to be written still have `Attr.Inode == 0` in memory, so the filer regenerates them with the fixed derivation on the next attempt. Entries that were written successfully are unaffected. `ES` could alternatively map the field as `unsigned_long`, but that only helps new indices and leaves the other JSON-serialized stores exposed.

# How is the PR tested?

`go test ./weed/util/ ./weed/mount/ ./weed/filer/` — new tests fail without the mask and pass with it:

```
--- FAIL: TestAsInodeFitsSignedLong (before the fix)
    fullpath_test.go:195: AsInode("/topics/.system/log/2026-10-02/entry-3", 0) = 13237854496031364273, above math.MaxInt64
--- FAIL: TestEnsureEntryInodeFitsSignedLong (before the fix)
    filer_inode_test.go:76: ensureEntryInode("/topics/.system/log/2026-10-02/entry-3") = 13237854558931364273, above math.MaxInt64
--- FAIL: TestEnsureEntryInodeHardLinkFitsSignedLong (before the fix)
    filer_inode_test.go:101: ensureEntryInode("/links/target-0.txt") = 14127641076746724116, above math.MaxInt64
```

The tests assert both halves of the invariant: every generated inode is `<= math.MaxInt64` (and non-zero, which the filer reads as "unset"), and 2000 paths across four creation times still get 2000 distinct inodes each. `TestEnsureEntryInodeSharesAcrossHardLinks` is updated to the normalized expectation.

Related: #10806

# Checks
- [x] I have added unit tests if possible.
- [ ] I will add related wiki document changes and link to this PR after merging.
- [ ] All AI code review comments have been addressed. No more comments to fix if reviewed again. Reviewer may request additional gemini and copilot reviews.

# Checks for AI generated PRs
- [x] I have reviewed every line of code.
- [x] The PR is kept as minimum as possible. Large PRs would not be accepted.

<!-- devin-review-badge-begin -->

---

<a href="https://app.devin.ai/review/seaweedfs/seaweedfs/pull/11567" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-devin-review-dark.svg?v=4"><img src="https://static.devin.ai/assets/gh-devin-review-light.svg?v=4" alt="Devin Review"></picture></a>
<!-- devin-review-badge-end -->

<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Bug Fixes**
  * Generated identifiers for files and hard links now stay within the supported positive range, improving compatibility when those identifiers are used by the system.
  * Improved checks confirm that identifiers remain valid and distinct across a range of file paths and hard-link values.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->
