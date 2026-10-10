The `@tracked` decorator now keeps each field in a `TrackedValue`, the class that the standalone `tracked(value)` form returns. A read or a write of a field does one `WeakMap` lookup. On `main` it does three map lookups through `trackedData`.

- This is an alternative to #21661, which adds a small private cell inside `trackedData`. Only one of the two must merge.
- `trackedData` has no caller in the repo after this PR. A separate PR can remove it.
- `pnpm bench` against `main`, after the rebase: no change for the full run (-0.4%, not significant). Against the cell of #21661: no difference.
- rere-benchmark against `main`, after the rebase: 1.9% faster in a noisy round of 8 cycles, and 3.7% faster in a quiet round of 4 cycles. `1 item, 100k updates` is 11.3% to 11.8% faster. The cell of #21661 is 2.7% faster than this PR in the quiet round.

## Rebased on `main`

This PR needed two parts of #21650, and both are merged: #21666 makes the functions of a `TrackedValue` on their first use, and #21667 has the fix for the V8 deopt on the first number.

The branch is now one commit on `main`, `9f82b544f7`, and it merges alone. The numbers below are from before the rebase, with #21650 as the base.

## How it works

- `descriptorForField` keeps one `WeakMap` from the instance to a `TrackedValue`. The getter reads `cell.value`, and the setter writes it.
- The `TrackedValue` is made at the first read or write of the field. A first read runs the initializer. A first write does not, as on `main`.

`TrackedValue` did not fit a field in three points. This PR handles each one:

| point | `TrackedValue` on `main` | in this PR |
| --- | --- | --- |
| tag | makes a private tag | the constructor takes an optional tag, and the decorator passes the tag of `tagFor(obj, key)` |
| equal values | `Object.is` skips the write | a field uses an `equals` that returns false, unless the decorator got an `equals` option |
| dev assertion | "already consumed" has no object and no key | the field setter runs the assertion itself, with the object and the key |

- The tag point matters because observers, computed chains, and `notifyPropertyChange` get the tag of a field from the registry.
- The equality point matters because `this.items = this.items` is how code reports a change inside a value.

## After the rebase, against `main`

Control is `main` at `9bec1cb2a8`, which has the merged parts of #21650. Experiment is the one commit of this PR, `9f82b544f7`.

`pnpm bench`, 50 paired rounds: [tracerbench-report.pdf](https://github.com/NullVoxPopuli-ai-agent/ember.js/blob/5552ba9aab33fd3630ae517b58848a7384735c03/ex-tv3-gc/tracerbench-report.pdf)

- Script time for the full run without GC: -0.4%, which is not significant.
- As full phases, 1 of 23 has a significant change: `removeSecondRow1` is 4.2% slower.
- `render` shows +40.3% in script time without GC, on a phase of 20 ms. With GC time included, the same phase is -0.1%. So this number comes from the GC subtraction on a small phase.

rere-benchmark, 8 mirrored cycles, 16 runs for each build, 0 void runs, geometric mean of 13 benches:

| pair | change | c1 | c2 | c3 | c4 | c5 | c6 | c7 | c8 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| this PR against `main` | -1.9% | +0.7% | -4.2% | +3.4% | +2.3% | -7.5% | -2.7% | -0.3% | -0.7% |

- The sign changes between cycles, and the `main` build drifted 5.4% between the first four cycles and the last four. The result is "no clear change".
- `1 item, 100k updates` is 11.8% faster. That bench writes one tracked field in a loop.
Direct comparison with the cell of #21661, in one more round with `main`, #21661 (with `main` merged in, `e2e0b1b558`), and this PR: 4 mirrored cycles, 0 void runs, and a `main` build that did not drift (-0.3%).

| pair | change | cycle 1 | cycle 2 | cycle 3 | cycle 4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| cell (#21661) against `main` | -6.2% | -0.0% | -8.0% | -6.4% | -11.0% |
| `TrackedValue` (#21662) against `main` | -3.7% | +2.7% | -7.9% | -0.1% | -5.2% |
| `TrackedValue` against the cell | +2.7% | +2.7% | +0.1% | +6.7% | +6.5% |

- In this quiet round, this PR is 3.7% faster than `main`, and the cell is 6.2% faster.
- This PR is behind the cell in each cycle, by 0.1% to 6.7%.

- The sections below are from before the rebase, when the control was #21650 without this PR.

## `pnpm bench`

Against the cell of #21661, with both changes on top of #21650: no phase differs.

- Tracerbench compare, 50 rounds: [tracerbench-report.pdf](https://github.com/NullVoxPopuli-ai-agent/ember.js/blob/46dc78dba727d5aa313f23b399e0669442570e5c/ex-tv-gc/tracerbench-report.pdf). Control is #21650 plus the two commits of #21661. Experiment is this PR.
- Script time for the full run: -0.2%, which is not significant. 0 of 23 phases have a significant change, in script time and as a full phase.
- The method is the one in the description of #21661: `smoke-tests/benchmark-app` with a `gc()` before the first mark, Chrome pinned to one core, 4x CPU throttle on a host with a limit of about 3 GHz, paired rounds, GC time removed.
- The benchmark app has one tracked field, which each row reads one time in a render.

Against #21650 alone: [tracerbench-report.pdf](https://github.com/NullVoxPopuli-ai-agent/ember.js/blob/32078bb3886906eb5ad63a17418341c82f294969/ex-tv2-gc/tracerbench-report.pdf).

- Script time for the full run: -0.3%, which is not significant.
- `selectSecondRow1` is 4.1% faster. `swapRows1` is 3.3% slower as a full phase, and `render10000Items1` is 2.2% faster as a full phase.

## rere-benchmark

`main`, #21650, #21650 with the cell of #21661, and this PR ran in 4 mirrored cycles: 8 runs for each build, 5 samples per bench in each run, 0 void runs. The numbers are the geometric mean of 13 benches.

| pair | change | cycle 1 | cycle 2 | cycle 3 | cycle 4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| cell against #21650 | -6.5% | -14.2% | -6.4% | -0.3% | -4.6% |
| this PR against #21650 | -2.9% | -9.5% | -1.2% | +2.6% | -2.4% |
| this PR against the cell | +3.9% | +5.5% | +5.5% | +2.9% | +2.3% |

- `1 item, 100k updates`: the cell is 21.1% faster than #21650, and this PR is 16.4% faster.
- So a `TrackedValue` costs more than the cell on each read and write. Likely parts of that cost are the `equals` call on each write and the frozen check. I did not measure the parts.

## Tests

- 3 new tests in `metal/tests/tracked/validation_test.js`: a write dirties the tag that `tagForProperty` gave before the first read or write, `notifyPropertyChange` dirties the tag that a read consumed, and a first write does not run the initializer.
- If the `TrackedValue` keeps a private tag, 5 tests of that file fail: the first two new ones and three that are on `main`.
- The full suite passes locally after the rebase: 9526 pass, 18 skipped, 0 failed.
- `tsc --noEmit`, ESLint, Prettier and `pnpm lint:docs` pass.

## Not measured

The benches have one or two tracked fields each. They show the cost of a read and a write, but not the size of a `TrackedValue` for each field of each instance. With #21650, a `TrackedValue` has 8 private fields. The cell of #21661 has 3 fields.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
