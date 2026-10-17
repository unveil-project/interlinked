Fixes #15897

`hotkeyStatsUpdateCurrentCmd()` gives each key `cpu_time_usec / numkeys` and `net_bytes / numkeys`, and drops the remainder. Once a command has more keys than it took microseconds, every key gets 0, and `chkTopKUpdate()` ignores a 0 weight. So keys read through `MGET`, `EXISTS`, `DEL` and the like never show up in `by-cpu-time-us`, while a rarely used key read with `GET` can look like the only CPU consumer. For the same reason `total-net-bytes` comes out lower than `net-bytes-all-commands-all-slots`.

The remainder is now spread one unit per key, so the credits for a command add up to its full cost. The extra unit starts at a random key, so the first keys of a command are not always the ones that get it. With the reproduction from the issue, all 32 `MGET` keys now show about 1950 us each, and `cold` drops out of the top 10.

The new test fails on `unstable` on both checks: `by-cpu-time-us` is empty, and `total-net-bytes` is lower than `net-bytes-all-commands-all-slots`.

<!-- CURSOR_SUMMARY -->
---

> [!NOTE]
> **Low Risk**
> Localized change to HOTKEYS metric attribution plus a regression test; no auth, persistence, or protocol changes.
> 
> **Overview**
> **HOTKEYS** now accounts for the full CPU and network cost of multi-key commands (`MGET`, `EXISTS`, etc.) when attributing metrics to individual keys in the top-K structures.
> 
> `hotkeyStatsUpdateCurrentCmd()` used integer division only, so any remainder from `cpu_time_usec / numkeys` and `net_bytes / numkeys` was lost. When a command touched more keys than microseconds of CPU (common for large `MGET`), every key got **0** credit and `chkTopKUpdate()` skipped those updates—skewing `by-cpu-time-us` and making `total-net-bytes` fall below `net-bytes-all-commands-all-slots`. The fix keeps the per-key floor and distributes the remainder **one unit at a time**, starting at a **random** key index so early argv keys are not always favored.
> 
> A unit test exercises repeated `MGET`/`EXISTS` over many keys and asserts non-empty CPU hotkey output plus aligned net-byte totals.
> 
> <sup>Reviewed by [Cursor Bugbot](https://cursor.com/bugbot) for commit d3ce9e0105db9d2047616f985d02d6fcf4b7ce02. Bugbot is set up for automated code reviews on this repo. Configure [here](https://www.cursor.com/dashboard/bugbot).</sup>
<!-- /CURSOR_SUMMARY -->