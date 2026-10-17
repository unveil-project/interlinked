Checklist:

<!-- Please follow this checklist and put an x in each of the boxes, like this: [x]. It will ensure that our team takes your pull request seriously. -->

- [x] I have read and followed the [contribution guidelines](https://contribute.freecodecamp.org).
- [x] I have read and followed the [how to open a pull request guide](https://contribute.freecodecamp.org/how-to-open-a-pull-request/).
- [x] My pull request targets the `main` branch of freeCodeCamp.
- [x] I have tested these changes either locally on my machine, or GitHub Codespaces.

<!--If your pull request closes a GitHub issue, replace the XXXXX below with the issue number.-->

Closes #70526

<!-- Feel free to add any additional description of changes below this line -->

## Summary

`actions/labeler` v6 with `sync-labels: true` does a read-modify-write on the PR's **entire** label set: it snapshots labels at run start, re-fetches them right before writing, then calls `setLabels` (PUT), which replaces the label set wholesale. A label added or removed by another workflow between that final re-fetch and the `setLabels` call is lost — exactly what happened on #70509, where `deprioritized` was wiped one second after the guidelines workflow added it.

This PR puts every workflow that writes PR labels behind a shared per-PR concurrency group, `pr-label-writes-<PR number>`, with `cancel-in-progress: false`. Workflow runs touching the same PR's labels now execute one at a time instead of interleaving, so the labeler's read-modify-write can never overlap another workflow's label write. Different PRs still run in parallel.

- `github-labeler.yaml`: joins the shared group (previously it used a per-workflow group that only serialized labeler-vs-labeler) and switches to `cancel-in-progress: false`, since `true` in a shared group would let a new labeler run cancel an in-progress guidelines/autoclose run mid-write.
- `github-pr-guidelines.yml`: joins the shared group — covers its three `addLabels('deprioritized')` sites and the `removeLabel` in `report-results.js`.
- `github-autoclose.yml`: joins the shared group — it has the identical race surface (`addLabels('spam')` on `.gitignore`-touching PRs), and the labeler still fires on the `closed` event autoclose produces.

One trade-off: the labeler no longer cancels its own superseded runs on rapid `synchronize` bursts; queued runs just execute in order (each recomputes labels from live PR state, so results are unchanged).

## Verification

- `actionlint` v1.7.7: clean on all three workflow files.
- Scripted simulation of the v6 sequence (snapshot -> re-fetch -> `setLabels`) against a label store: pre-fix interleavings reproduce both failure modes (a `deprioritized` add landing in the write window is dropped; a concurrent `removeLabel` is resurrected); serialized order produces the correct final set in both directions.

## Assistance

AI-assisted. AI tools helped with the code changes and with drafting text on this pull request, including replies on its thread. The verification steps above were actually run.

