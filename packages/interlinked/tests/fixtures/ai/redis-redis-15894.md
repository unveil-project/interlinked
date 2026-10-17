## What does this PR do?

Fixes an IDMP producer leak on the rejected-`XADD` path in `xaddCommand()`.

`xaddCommand()` calls `idmpGetOrCreateProducer()` before any of the error
checks, while `trackStreamIdmpEntries()` — the only place that puts the key
into `db->stream_idmp_keys` — runs only after `streamAppendItem()` has
succeeded. `handleExpiredIdmpEntries()` iterates `db->stream_idmp_keys`
exclusively (`if (dictIsEmpty(db->stream_idmp_keys)) continue;`), so a producer
left behind by a rejected command is never visited and never freed, and
`stream-idmp-duration` is never applied to it.

The leaked state only disappears if some *later* `XADD ... IDMP` on the same key
succeeds and registers the key. A stream whose ID space is exhausted can never
get that write, so its leak is permanent and grows with every retry.

The fix looks the producer up without creating it, and creates it next to
`idmpInsertEntry()`, i.e. once the append has actually succeeded. A command
that returns an error and stores nothing now leaves no IDMP state behind.

Fixes #15840.

## Reproduction

```
stream-idmp-duration 1
XADD ok   IDMP p<i> i0 * f v          # x5000, succeeds
XADD full 18446744073709551615-18446744073709551615 f v
XADD full IDMP p<i> i0 * f v          # x5000, every one errors with
                                      #   "The stream has exhausted the last possible ID"
```

Before:

```
                                          pids before   pids after 6s   MEMORY USAGE
5000 failed XADD ... IDMP (exhausted ID)         5000            5000        248340
```

`XLEN full` is 1 — the 5000 rejected commands stored nothing, yet the stream
carries 5000 producers and about 248 KB that is never released. After this
change `pids-tracked` on that stream is 0.

A second trigger through the same path is an entry whose summed element length
exceeds `STREAM_LISTPACK_MAX_SIZE` (`streamAppendItem()` → `ERANGE`, "Elements
are too large to be stored"); that one is not covered by the new test because
it needs >1 GiB of field data to reach.

## Tests

Added `XADD IDMP rejected command leaves no producer behind` in
`tests/unit/type/stream.tcl`: after exhausting the stream ID space it issues
five rejected `XADD ... IDMP` commands and asserts `pids-tracked`/`iids-tracked`
are 0 and `XLEN` is unchanged, then confirms on a healthy stream that a
successful `XADD ... IDMP` still creates the producer and still deduplicates a
repeat IID. Verified it fails on unpatched `unstable` (`pids-tracked` 5) and
passes with the patch.

```
$ ./runtest --single unit/type/stream
    [ok]: XADD IDMP rejected command leaves no producer behind (2 ms)
    \o/ All tests passed without errors!

$ ./runtest --single unit/type/stream-cgroups --single unit/aofrw --single unit/dump
    \o/ All tests passed without errors!

$ ./runtest --single unit/memefficiency
    \o/ All tests passed without errors!

$ make            # -Wall -Wextra -Werror, clean
```

## Notes / follow-ups

- The AOF rewrite and RDB save paths (`aof.c:2794`, `rdb.c:827`) only walk
  `s->idmp_producers`, so they are unaffected.
- `xidmprecordCommand()` keeps using `idmpGetOrCreateProducer()` unchanged:
  it can only fail before that call on argument/lookup errors, so it has no
  rejected-append path.
- `XADD ... IDMP` that is deduplicated (existing IID) still leaves the producer
  where it was — no new allocation, no removal.
- The `<local>` / `NOMKSTREAM` early returns happen before the IDMP block, so
  they are unaffected.

## AI assistance disclosure

The analysis, patch and test were prepared with AI assistance. I read the
affected code paths, reproduced the leak on unpatched `unstable`, and reviewed
every line of the diff before submitting.

<!-- CURSOR_SUMMARY -->
---

> [!NOTE]
> **Medium Risk**
> Changes IDMP state timing on the XADD path; behavior for successful and duplicate-IID commands should stay the same, but any missed failure path could still leak or skip deduplication.
> 
> **Overview**
> **Defers IDMP producer creation until `XADD` actually appends**, so failed commands no longer leave orphaned producers that expiration never cleans up.
> 
> `xaddCommand()` now **looks up** producers with new `idmpGetProducer()` during the pre-append IID check (and skips duplicate lookup when the producer does not exist yet). **`idmpGetOrCreateProducer()` runs only after a successful append**, immediately before `idmpInsertEntry()`.
> 
> Adds a stream unit test that exhausts stream IDs, issues rejected `XADD ... IDMP` commands, and asserts `pids-tracked` / `iids-tracked` stay zero while successful IDMP behavior still works.
> 
> <sup>Reviewed by [Cursor Bugbot](https://cursor.com/bugbot) for commit 90ea91a72300abbf98a7b109fb163b540094c138. Bugbot is set up for automated code reviews on this repo. Configure [here](https://www.cursor.com/dashboard/bugbot).</sup>
<!-- /CURSOR_SUMMARY -->
