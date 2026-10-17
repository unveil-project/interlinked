### Problem

A stream restored from a listpack whose record flags use a valid but **non-minimal** integer encoding crashes the server on the next trim.

`streamTrim()` (`src/t_stream.c`) marks an entry deleted like this:

```c
ptrdiff_t delta = p ? p - lp : 0;
flags |= STREAM_ITEM_FLAG_DELETED;
lp = lpReplaceInteger(lp, &pcopy, flags);
if (p) p = lp + delta;
```

`pcopy` points at the record's flags element and `p` points past the whole entry. When `lpReplaceInteger()` re-encodes the flags in their shorter canonical form, the listpack shrinks, so `lp + delta` overshoots the next entry. The following iteration parses the wrong bytes and aborts:

```
ASSERTION FAILED: t_stream.c 'ret != 0'  (lpGetIntegerIfValid <- streamTrim <- xtrimCommand)
```

`streamValidateListpackIntegrity()` accepts integers that are not in their shortest encoding, so a checksum-valid `RESTORE` payload with a wider-than-needed flags element passes validation and then crashes on the first `XTRIM`/trim. Reported in #4838; confirmed on 9.1.2 and unstable, same code in 7.2–9.0.

### Fix

Recompute the cursor from the actual change in listpack size rather than the stale pre-replacement offset:

```c
size_t oldbytes = lpBytes(lp);
lp = lpReplaceInteger(lp, &pcopy, flags);
if (p) p = lp + delta - ((ptrdiff_t)oldbytes - (ptrdiff_t)lpBytes(lp));
```

`pcopy` is the only element that changes, and it sits before `p`, so shifting `p` by the net size delta lands it exactly on the next entry. When the flags are already minimally encoded the size is unchanged, so the behaviour is identical to before.

### Test

`StreamListpackIntegrityTest.TrimSurvivesNonMinimalFlagsEncoding` builds a structurally valid two-record stream listpack, re-encodes the first record's flags with a non-minimal 16-bit integer (the shape a crafted RESTORE takes), asserts it still passes `lpValidateIntegrity`/`streamValidateListpackIntegrity`, then trims it with `MAXLEN = 1`.

- Before the fix the trim reads past the next entry and crashes (the server build trips the `lpGetIntegerIfValid` assertion the issue cites; the unit harness segfaults on the same stale cursor).
- With the fix the trim removes one entry and leaves the stream at length 1.

Closes #4838
