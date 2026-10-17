Thanks — adding related issues that appear to be the same failure family (sandbox/media path validation + message tool/mediaLocalRoots propagation):

- #21903 — message tool uses default media roots instead of agent-scoped roots
- #20258 — message action path missing `mediaLocalRoots` into channel plugins
- #19097 — sandbox-generated media rejected by outbound path validation
- #17334 — workspace media paths rejected (post-fix regression)
- #15541 (closed) — earlier fix for local media allowlist mismatch

From current reproduction, this looks like a **cross-channel shared pipeline issue** (not channel-specific):

1) sandbox path normalization/validation,
2) then local roots allowlist check,
3) with inconsistent root assumptions between layers.

If maintainers agree, this issue can be linked/triaged as related (or duplicate of the canonical one) and tracked under a single root-cause fix in the shared outbound/media path flow.
