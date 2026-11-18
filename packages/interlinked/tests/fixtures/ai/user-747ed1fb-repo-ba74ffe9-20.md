Part of #6 and the Q4 2026 roadmap (#1).

Re-verify the **LiveKit Agents** adapter of `voice-agent-evals` against the current official docs, and bring its header into the format required by [`docs/neutrality.md`](https://github.com/mahimailabs/voice-ai-skills/blob/main/docs/neutrality.md#required-fields).

## Files

- `skills/voice-agent-evals/references/adapters.md`, the **LiveKit Agents** section
- `skills/voice-agent-evals/SKILL.md`, the **LiveKit Agents** entry under `## Adapters`

## Steps

1. Check every claim in the **LiveKit Agents** section against the vendor's official docs, API schema, or source code. Never a blog post or a summary.
2. Fix what changed, with one source link per claim.
3. Make the section open with the pinned version (or "Unversioned docs") and the verification date, in the same wording as the other adapters.
4. A setting that no longer exists is marked as not available, with what to do instead. Do not delete the row.
5. Add a line to `CHANGELOG.md` under `Unreleased` if any claim changed.

## Done when

- [ ] Every claim re-checked, with a source per claim
- [ ] Pinned version and verification date updated, even if nothing else changed
- [ ] `python scripts/validate.py` passes
- [ ] The pull request lists what changed and what was re-checked unchanged

The adapters were last verified on 11 September 2026, so expect to confirm most claims rather than change them. Recording what you re-checked is part of the work.

See [CONTRIBUTING.md](https://github.com/mahimailabs/voice-ai-skills/blob/main/CONTRIBUTING.md#refreshing-an-adapter). Comment here to pick it up, so two people don't do the same one.