## Description

`onError` ignores permission errors unconditionally, including one on the scan root itself. When the root cannot be read, `filepath.WalkDir` reports that error for the root, `onError` swallows it, the walk ends having visited nothing, and `Walk` returns `nil`. The scan then finishes with exit code 0.

Below the root, ignoring permission errors is deliberate and useful: a tree with a few unreadable directories should still be scanned as far as it can be. The root is different, because nothing can be read at all, so there is no partial result to keep. This adds that one carve-out.

### Before

```
$ chmod 000 /tmp/unreadable          # contains creds.txt with an AWS key
$ trivy fs -q --scanners secret /tmp/unreadable
Report Summary

┌────────┬──────┬─────────┐
│ Target │ Type │ Secrets │
├────────┼──────┼─────────┤
│   -    │  -   │    -    │
└────────┴──────┴─────────┘
$ echo $?
0
```

An empty report and exit code 0. The `-` does mean "Not scanned" in the legend, so a careful reader can spot it, but the exit code is what CI and wrapper scripts act on, and it says the scan passed.

### After

```
$ trivy fs -q --scanners secret /tmp/unreadable
FATAL  Fatal error  run error: fs scan error: scan error: scan failed: failed analysis:
analyze with traversal: walk dir error: unable to read /tmp/unreadable: open /tmp/unreadable: permission denied
$ echo $?
1
```

### Where this came from

I ran into it while reviewing #10938, which adds a `filePath == root` carve-out in `WalkDirFunc` for other unreadable paths and leaves permission errors to `onError`. I noted there that the permission path has the same question one level up and said it looked like a separate change; this is that change. The two do not overlap: #10938 returns root errors from `WalkDirFunc`, and `onError` still swallows them when they are permission errors, so this is still needed on top of it.

## Related issues

None that I could find. I searched open and closed PRs for `permission`, `unreadable root`, `IsPermission` and `onError` and found nothing covering this.

## Checklist
- [x] I've read the [guidelines for contributing](https://trivy.dev/docs/latest/community/contribute/pr/) to this repository.
- [x] I've followed the [conventions](https://trivy.dev/docs/latest/community/contribute/pr/#title) in the PR title.
- [x] I've added tests that prove my fix is effective or that my feature works.
- [ ] I've updated the [documentation](https://github.com/aquasecurity/trivy/blob/main/docs) with the relevant information (if needed).
- [ ] I've added usage information (if the PR introduces new options)
- [x] I've included a "before" and "after" example to the description (if the PR is a user interface change).

Documentation and usage are unticked on purpose: no flag or option changes, and the behaviour being corrected is not documented as intentional anywhere I could find. Say the word if you would rather it were mentioned in the docs.

## Test

`TestFS_WalkUnreadable` has two subtests, and the pairing is the point. Reverting the change in `fs.go` and rerunning gives:

```
--- FAIL: TestFS_WalkUnreadable/unreadable_root_fails_the_walk
--- PASS: TestFS_WalkUnreadable/unreadable_directory_below_the_root_is_skipped
```

The second one passing without the fix is the half I cared about: the deliberate behaviour below the root is unchanged, and the readable part of a tree is still scanned. The test skips on Windows, where a `0o000` mode does not deny reads, and when running as root, which bypasses the check.

## Verification

```
gofmt -l pkg/fanal/walker/     # no output
go build ./pkg/...             # ok
go vet ./pkg/fanal/walker/     # ok
go test ./pkg/fanal/walker/    # ok
```

`go build ./...` fails in `magefiles` with `function main is undeclared in the main package`, which I checked reproduces identically on a clean `main` at `8f815546c`, so it is unrelated to this change.
