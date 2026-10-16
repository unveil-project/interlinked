All of your review points are addressed on this branch (per-point detail in my reply above).

One thing worth flagging so a red check does not stall the review: the `e2e` failure is **inherited from `main`, not caused by this diff**. `main@db347087` fails the same single test:

```
e2e/open-focus-typing.spec.ts:210 > sheets: typing works when a spare view opens the next workbook
  Expected: 4242   Received: "Old"   (Timeout 15000ms exceeded)
```

I diffed the failed job logs: the affected PRs fail on that one test and nothing else, and the `test` job is green on this branch. #1630 looks like it is fixing the underlying flake.

I cannot re-trigger the job from here - `rerun-failed-jobs` returns 403 (needs admin on the repo) - so a re-run from your side would clear it. Otherwise this diff is unrelated to the failing path and is ready for re-review.
