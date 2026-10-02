tl;dr: when navigating the tree
- read in place without locks, don't lock, copy, then read
- organize data (node children) so that it can be read contiguously, not as point reads

## What changes

An add batch routes vectors through a stable tree, then writes posting rows to the selected leaves. With many workers, writing each row immediately makes workers wait for leaf locks while they are still routing. This change lets each worker collect posting rows in its own per-leaf buffers and joins all workers before it writes the rows. The flush groups buffers by destination and takes one write lock per leaf. Balancing starts only after the flush finishes.

The batch method owns the full phase and requires exclusive access to the writer. Each buffer stores an ID, its assigned version, and its quantization code; the writer's embedding map retains the full vector. This also replaces a full embedding copy with an `Arc` clone when the input is already shared, so the measured gain includes that allocation change. The immediate `add()` method remains available for callers outside this benchmark path.

The flush appends to in-memory rows even when older posting rows remain on disk. Version checks reject deleted IDs, repeated IDs get new versions, and a vector can appear in more than one leaf. A missing destination fails the batch instead of silently dropping a posting. The exclusive batch method keeps the tree stable from routing through flush.

## Validation

The writer and posting persistence integration targets pass: 11 and 18 tests respectively. They cover parallel worker buffers, repeated IDs across workers with different embeddings, deleted IDs, replication to two leaves, aligned IDs/versions/codes, lazy persisted posting merge, commit, and reopen. The benchmark target passes `cargo check`. All four 1M-vector benchmark commands exited with status 0.

## Benchmark

The branch starts at the pinned `ff2db33` control commit and includes the packed live-parent navigation change from #7838. It is an independent alternative targeting `hierarchical-spann`; the PR diff contains that navigation change plus local buffers. The target branch has a separate neighbor reassignment change after the pinned control commit, so merged performance needs reevaluation. Related alternatives are #7829 (navigation snapshot per batch), #7836 (immutable reference index), and #7838 (packed centroids on live parents).

Each run indexed 1M 1024-dimensional vectors in ten 100K checkpoints, with two runs per dataset. Both used L2, full-precision writer navigation and neighbor reassignment, 100 precomputed queries, and final warm recall at tau 1.5 with one rerank vector. Wikipedia used 32 add and balance threads, write beam tau 0.5, level taus `_,_,0.30`, and RNG factor 0. MS MARCO used 64 threads, write beam tau 1.5, and RNG factor 4. All runs used a 1 GiB block cache. No run used `--write-level-min-pcts` or `--verify-valid-postings`.

Add wall time includes packed navigation setup, worker collection, grouping, and flush. Build time sums checkpoint add, balance, load, commit, and reopen components. The two late MS MARCO run 2 balance durations are printed to one decimal minute, so its build estimate has about six seconds of rounding uncertainty. Worker task totals overlap across threads and are not CPU time. Peak RSS comes from `/usr/bin/time -v`; recall is warm L2 recall at 100.

### All revisions: two-run means

The table combines the saved controls with this PR. Add task sums time measured inside worker add calls across threads; for this PR it measures delta collection and excludes the later flush. Add wall measures elapsed indexing across all ten checkpoints, including collection and flush, and is the comparable end-to-end add measure. Balance and build means use the printed add, balance, load, commit, and reopen components for every revision; long durations rounded to tenths of a minute make the MS MARCO build mean for this PR approximate (about three seconds of uncertainty). Peak RSS is the mean of the two per-run peaks, and recall is mean warm L2 recall@100.

| Dataset | Revision | Add task mean (s) | Add wall mean (s) | Balance mean (s) | Build mean (s) | Peak RSS mean (GiB) | Recall mean (%) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Wikipedia | Base | 129.11 | 4.478 | 231.32 | 258.78 | 7.85 | 77.28 |
| Wikipedia | #7829 | 99.22 | 3.490 | 240.13 | 266.64 | 7.85 | 77.23 |
| Wikipedia | #7836 | 106.41 | 3.647 | 213.88 | 240.23 | 7.96 | 77.38 |
| Wikipedia | #7838 | 144.02 | 5.938 | 204.24 | 233.08 | 7.99 | 77.20 |
| Wikipedia | This PR (#7841) | 84.09 | 3.179 | 190.81 | 216.79 | 7.35 | 77.26 |
| MS MARCO | Base | 240.18 | 4.128 | 310.01 | 402.94 | 7.48 | 80.81 |
| MS MARCO | #7829 | 184.49 | 3.346 | 313.07 | 406.25 | 7.47 | 81.08 |
| MS MARCO | #7836 | 191.74 | 3.483 | 308.42 | 401.99 | 7.37 | 80.13 |
| MS MARCO | #7838 | 252.51 | 5.990 | 300.65 | 396.77 | 7.66 | 80.63 |
| MS MARCO | This PR (#7841) | 146.98 | 2.688 | 417.69 | ≈510.18 | 6.91 | 80.72 |

The per-run comparison between #7838 and this PR follows.

| Dataset | Revision | Run | Add wall (s) | Collect (s) | Group + flush (s) | Balance (s) | Build (s) | Peak RSS (GiB) | Recall (%) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Wikipedia | #7838 | 1 | 5.720 | — | — | 228.34 | 256.95 | 7.94 | 76.67 |
| Wikipedia | #7838 | 2 | 6.155 | — | — | 180.13 | 209.21 | 8.04 | 77.72 |
| Wikipedia | This PR | 1 | 3.142 | 3.042 | 0.094 | 191.67 | 217.64 | 7.40 | 77.16 |
| Wikipedia | This PR | 2 | 3.215 | 3.116 | 0.096 | 189.95 | 215.94 | 7.29 | 77.35 |
| MS MARCO | #7838 | 1 | 6.313 | — | — | 303.54 | 400.10 | 7.58 | 80.32 |
| MS MARCO | #7838 | 2 | 5.666 | — | — | 297.77 | 393.44 | 7.73 | 80.94 |
| MS MARCO | This PR | 1 | 2.675 | 2.562 | 0.110 | 305.14 | 397.45 | 7.06 | 80.81 |
| MS MARCO | This PR | 2 | 2.701 | 2.593 | 0.105 | ≈530.25 | ≈622.91 | 6.75 | 80.62 |

Mean add wall time falls 46.5% on Wikipedia (5.938 to 3.179 seconds) and 55.1% on MS MARCO (5.989 to 2.688 seconds) relative to #7838. The saved base, #7829, and #7836 mean add wall times are 4.478, 3.490, and 3.647 seconds on Wikipedia and 4.128, 3.346, and 3.483 seconds on MS MARCO. At checkpoint 10, reported leaf-lock wait amortized per registered posting falls from 18.7–30.3 microseconds to 48–206 nanoseconds on Wikipedia and from 67.3–75.3 microseconds to 200–506 nanoseconds on MS MARCO. A buffered flush takes one lock for many postings, so this is not the wait time of a single lock acquisition.

**The MS MARCO full-build result is a material risk.** Candidate run 2 takes two balance rounds at checkpoints 9 and 10, about 150 and 168 seconds, versus one round and about 54 and 51 seconds in candidate run 1. Its summed timed work across concurrent scrub calls rises to 90.2 and 102.3 worker-minutes versus 1.2 and 1.1 in run 1; merge timing also rises to 1.7 and 1.8 worker-minutes versus milliseconds. Split counts, persisted posting loads, and final leaf counts remain similar. The logs identify extra rounds with scrub and merge latency, but do not establish the initiating cause. Buffering changes posting order and may change the later tree. The two-run sample does not support a full-build improvement claim; the MS MARCO candidate mean is about 510 seconds versus #7838's 397 seconds.

Warm recall and peak RSS stay within the range of the saved runs. Each candidate summary reports 1M unique vectors and zero orphaned IDs, but that summary scans all nodes and does not prove that every valid posting is reachable from the root. The performance flags omit the reachable-posting check; focused integration tests cover the persisted posting path.

The source checkout, pinned executable, runner, commands, exit codes, logs, `/usr/bin/time` records, and SHA-256 are on the EC2 host under `/home/ubuntu/chroma-benchmark-leaf-deltas` and `/home/ubuntu/benchmark-data/navigation-1m-100k-leaf-deltas`. The exact tested source is `c65f153b62157df19cc399a0e805e716804952dc`, and executable SHA-256 is `01a5417c4e9da47c2edfa5db28b1e2a1ca5204a89cf459a3e51a32b6b43b084b`. A detailed local summary is at `/private/tmp/lyon-navigation-leaf-deltas-1m-results.md`.

