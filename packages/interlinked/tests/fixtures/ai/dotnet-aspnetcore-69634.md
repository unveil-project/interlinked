<!-- Thank you for submitting a pull request to our repo. -->

<!-- If this is your first PR in the ASP.NET Core repo, please run through the checklist
below to ensure a smooth review and merge process for your PR. -->

- [x] You've read the [Contributor Guide](https://github.com/dotnet/aspnetcore/blob/main/CONTRIBUTING.md) and [Code of Conduct](https://github.com/dotnet/aspnetcore/blob/main/CODE-OF-CONDUCT.md).
- [x] You've included unit or integration tests for your change, where applicable.
- [x] You've included inline docs for your change, where applicable.
- [ ] There's an open issue for the PR that you are making. If you'd like to propose a new feature or change, please open an issue to discuss the change or find an existing issue.

<!-- Once all that is done, you're ready to go. Open the PR with the content below. -->

Harden review bundle preparation, hosted review publication, and reviewer worker handling

## Description

Follow-up to #69502. The producer and hosted workflow changes make bundle preparation and publication more robust. The `SKILL.md` changes clarify how workers read bundled guidance and how many workers run; they don't change review criteria or judgment.

### Bundle producer (`scripts/prepare-review.cs`)

- **Bounded process output:** stdout and stderr are now counted while the child process runs. Once either passes the existing 64 MiB limit, the producer kills the whole process tree and fails with the existing `BLOCKED` error. Exit-code and stderr reporting are unchanged. Previously both streams were read fully into memory before the size check.
- **`--check` re-freeze:** after validating a prepared bundle, `--check` re-freezes the target and fails closed if the PR head or base moved during validation. It now does what the normal preparation path already does before writing its manifest.
- **One bounded retry:** when the target or base branch moves *during preparation*, the producer deletes its partial output and rebuilds from scratch, exactly once. A second move, or any other failure, still returns `BLOCKED`. `--check` never retries.

The first two address the Copilot review comments on #69502: bounding output while reading, and re-checking identity after bundle validation.

### Skill (`SKILL.md`)

- When a bundle read fails with Copilot CLI's generic `Permission denied and could not request permission from user`, the reviewer tells the user to rerun interactively or with `--allow-all-paths`. It doesn't claim the error proves a long-path cause.
- **Guidance file paths:** guides, policies, and context documents under `guidance.root` use the manifest's `.source` suffix, matching how the producer writes them while retaining unsuffixed logical manifest paths.
- **Single worker per guide:** each routed guide gets exactly one fresh worker. A coordinator may correct or clarify only with that same worker; it must record the guide as incomplete rather than relaunching or replacing the worker.

Both `SKILL.md` fixes address defects that invalidated local evaluation runs: workers reading guidance without the `.source` suffix, and a coordinator relaunching a worker.

### Hosted workflow (`pull-request-review.md` / `.lock.yml`)

- **Live-head re-check inside publication:** gh-aw v0.89.21's supported `jobs.safe_outputs.pre-steps` hook re-reads the live PR inside the publishing job, before agent output is downloaded or processed. Publication is blocked if the head moved, the PR closed, or the base repository changed. The existing `verify_live_head` job stays as an earlier fail-fast gate. The read still isn't atomic with the API writes; the trusted `commit-id` keeps review attribution pinned to the reviewed SHA.
- **Visible BLOCKED/INCOMPLETE status:** one capped, PR-only `add-comment` safe output posts:

  ```text
  Review not published (<STATUS>): <reason>

  No partial findings were published.
  ```

  The reason is the same single-line reason (at most 240 characters) given to `report_incomplete`. The trusted preflight rejects a status comment combined with findings, a review, or `noop`; a malformed one; or one whose reason doesn't match. Status is only reported for failures inside the agent; a bundle-preparation failure still ends the run before the agent starts.

### Validation

- `git diff --check`: **passed**.
- `dotnet run --project .github/skills/review-pull-request/scripts/PrepareReview.Tests.csproj` (after `source activate.sh`): **44/44 passed** (`Total: 44, Errors: 0, Failed: 0, Skipped: 0, Not Run: 0`).
- **Red/green:** with each fix temporarily removed, its new tests failed for the intended reason:
  - the `--check` re-freeze tests and the retry tests (`CheckRejectsATargetThatMovesDuringValidation`, `RetriesOneMovedTargetFromScratch`, `BlocksWhenTheTargetMovesTwice`) failed: 3 tests;
  - the output-limit test (`KillsAChildWhenProcessOutputExceedsTheLimit`) failed: the child kept running for about 5 s instead of being killed.
- **Real run:** `dotnet run .github/skills/review-pull-request/scripts/prepare-review.cs -- --repo dotnet/aspnetcore --pr 69522 --output <tmp> --guidance-root .` produced a ready v2 bundle, and the same command with `--check` revalidated it.
- **Workflow compile:** gh-aw v0.89.21 `compile pull-request-review --strict` passed twice with byte-identical locks. `.github/aw/actions-lock.json` is unchanged. No recompile was needed for the later `SKILL.md`-only follow-up because the workflow installs the local skill by path at runtime and the generated lock neither embeds nor hashes `SKILL.md` content.
- **Local native check of the two `SKILL.md` fixes (Windows, four runs on #69484, #68365, #67616, and #65504):** no unsuffixed guidance reads, and exactly one worker per routed guide with no relaunch or replacement, verified from raw session events. These runs used an earlier head that also contained evidence-contract wording, which has since been removed from this PR. One run correctly ended `INCOMPLETE` after a worker misjudged a recovered path probe; it was reported as incomplete, not as a clean review.
- **Hosted, on a fork only:** two runs of the producer and workflow changes at `9be41d75dd`, before the later `SKILL.md`-only commit. Both were cleaned up afterwards.
  - **Normal path** (run 36919666671): every job succeeded, including the new in-job head re-check. Exactly one COMMENT review was posted, pinned to the frozen head, with the planted finding. There was no status comment or incomplete signal.
  - **Forced INCOMPLETE** (run 36916516447): `verify_live_head`, detection, and `safe_outputs` succeeded. Exactly one neutral status comment was posted, with no review or inline findings. The run concluded `failure` as designed, because `report_incomplete` fails closed.

No product code changes.

Follow-up to #69502
