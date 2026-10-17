### What changes were proposed in this pull request?

Add one entry to the Spark Core 4.3-to-4.4 migration guide describing the RDD checkpoint-file filtering change from #58535.

The note explains that names such as `part-00000.bak`, `part-backup`, and `part-` are now ignored instead of causing `NumberFormatException`. Validation of numeric partition names and the contiguous partition sequence is unchanged.

### Why are the changes needed?

This documents the behavior change already merged for [SPARK-58881](https://issues.apache.org/jira/browse/SPARK-58881), following the [post-merge review request](https://github.com/apache/spark/pull/58535#issuecomment-5870625252). The fix was merged into master and branch-4.x; the latter targets Spark 4.4.

### Does this PR introduce _any_ user-facing change?

No. Documentation only; no additional runtime behavior change.

### How was this patch tested?

- Checked the wording against the merged `ReliableCheckpointRDD.getPartitions` / `isCheckpointFile` implementation and the SPARK-58881 regression in `CheckpointStorageSuite`.
- `git diff --check` passed; the only changed file is `docs/core-migration-guide.md`.
- Parsed the page's YAML front matter and checked for unresolved conflict markers.
- Did not rerun runtime tests because no code changes.
- The full Jekyll documentation build was not run locally: the machine has Ruby 2.6 and does not have the required Bundler 2.4.22 / Ruby 3 documentation environment. Remote documentation CI is pending.

### Was this patch authored or co-authored using generative AI tooling?

Generated-by: OpenAI Codex (GPT-5)

This contribution is submitted under the project's Apache License 2.0.
