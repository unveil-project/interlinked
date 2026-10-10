### Summary

Contribution source: AI-assisted

The server code moved from `src/server/` to `apps/server/src/` in #14949, but `packages/agent-signal/README.md` still points at the old location. 21 links in the file 404 on GitHub (10 distinct targets), plus one plain-text path on line 7.

This updates them all to `apps/server/src/...` and keeps the link text in sync. The source events table is re-padded so its columns stay aligned. The `../../src/store/...` links in the same file still resolve, so they're unchanged.

#### Test

- [ ] Tested locally
- [ ] Added/updated tests
- [x] No tests needed

Docs only. Each of the 10 new targets was checked on `canary`, and `src/server/` no longer exists.

- Acceptance: not needed, documentation-only change with no product behavior change.

#### 🔗 Related Issue

None. Follows up the move in #14949.

### AI assistance

- Harness: Claude Code (desktop app), version unknown
- Model: claude-opus-5-5
- Thinking level: unknown
- Division of work: AI found the broken links, checked each target through the GitHub API and made the edit. I approved the change from its summary; a line-by-line human review of the diff is pending.
- Implementation rationale: the files moved in #14949 and the README wasn't updated. Repointing the links is the smallest fix and matches where the code now lives.
- Verification: see Test. No build or lint was run, since only a markdown file changed.
