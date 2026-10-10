- [ ] For first time contributors, read [Submitting a pull request]
- [x] All code is covered by unit and/or runtime tests where feasible.
- [x] All commits contain a well written commit description including a title,
      description and a `Fixes: #XXX` line if the commit addresses a particular
      GitHub issue.
- [ ] If your commit description contains a `Fixes: <commit-id>` tag, then
      please add the commit author[s] as reviewer[s] to this issue.
- [x] All commits are signed off. See the section [Developer’s Certificate of Origin]
- [x] Provide a title or release-note blurb suitable for the release notes.
- [ ] Describe how you have tested this change in a live environment such as
      [kind], if applicable.
- [x] Disclose use of machine learning models (including LLMs and other generative AI)
      in accordance with the [Cilium AI Policy], and indicate the rating using
      [AI Influence Level].
      Example: "This PR was prepared with AIL:N. I personally checked X."
- [ ] Thanks for contributing!

Unticked: first-time reading, commit-id Fixes (n/a), live kind test (unit only).

Fixes: #49199

The multi-pool allocator returned a "marked as orphan" error on every reconcile for CIDRs of a deleted pool, even after the node cleared its request. Now the error is returned only while the pool is still requested; otherwise the CIDRs are kept as orphans.

Prepared with AIL:3. `go test -v . -run TestOrphanCIDRs`: fails before, 5 passed after.

```release-note
operator/ipam: multi-pool allocator no longer returns an orphan error every reconcile for a deleted pool the node no longer requests.
```

[AI Influence Level]: https://danielmiessler.com/blog/ai-influence-level-ail
[Cilium AI Policy]: https://github.com/cilium/community/blob/main/AI-POLICY.md
[Developer’s Certificate of Origin]: https://docs.cilium.io/en/stable/contributing/development/contributing_guide/#dev-coo
[Submitting a pull request]: https://docs.cilium.io/en/stable/contributing/development/contributing_guide/#submitting-a-pull-request
[kind]: https://kind.sigs.k8s.io
