`--groups=` is the one numeric capsh option that still parses its value with a
bare `strtoul()`. The result is an `unsigned long`, `group_list[]` is `gid_t`, and
the assignment narrows silently, so a value that does not fit a gid_t selects a
different group instead of being rejected.

Measured on master e435fc5, before the change. The first option sets a group that
differs from the container default, so the second one is what moves it:

```
capsh --groups=5 --groups=4294967296 --print   ->  accepted, groups=0(root)
capsh --groups=0 --groups=4294967301 --print   ->  accepted, groups=5(tty)
```

The first line is the unhelpful direction: a caller asking for an unprivileged
group ends up in group 0. The second confirms the narrowing rather than a default,
since 4294967301 is 2^32 + 5 and group 5 comes out. Both exit 0 and print no
warning, so nothing tells the caller that the requested list was not the one that
was set. `doc/capsh.1` describes the option as setting "the supplementary groups
to the numerical list provided".

The project has already ruled on this class twice:

* bd54ca54 hardened `nonneg_uint()` with `value != (unsigned) value`, which covers
  `--uid`, `--gid`, `--cap-uid`, `--secbits`, `--keep`, `--killit`, `--forkfor`,
  `--is-uid` and `--is-gid`. `--groups=` does not call that helper, so the sweep
  did not reach it.
* 462762b added `validID()` to the Go package and made `SetGroups()` return
  `EINVAL` for values at or above the all-ones id, which is the same check on the
  same syscall from the other side.

The same guard is in `getpcaps.c` and `setcap.c` as well.

The patch routes the value through `nonneg_uint()` like the other 9 options.
Tests go into `progs/quicktest.sh` next to the existing option checks: the two narrowing
cases with `fail_capsh`, plus `pass_capsh --groups=5` so that a valid list is still
accepted and the test does not simply reject everything.

`make test` and `make sudotest` pass before and after. Without the fix,
quicktest.sh stops at `PROBLEM TEST: --groups=4294967296 --print`.

I have mailed the patch upstream, formatted with git format-patch, the way the
project page asks for it. It applies cleanly to e435fc5; I verified that with
git am on a fresh clone.
