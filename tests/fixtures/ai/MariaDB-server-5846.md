## Summary

`Table_map_log_event::Table_map_log_event` does not bound `m_colcnt` (a 64-bit attacker-controlled value). The fix for MDEV-40644 bounded `m_dblen`/`m_tbllen` but left this field; the range checks from MDEV-39689 are bypassable via 64-bit wrap-around.

## Details

`my_multi_malloc(..., (uint) m_colcnt, ...)` truncates to 32 bits for the allocation, while `memcpy(m_coltype, src, m_colcnt)` uses the full 64-bit value. With `m_colcnt = 2^64 - k`, the guard `ptr_after_colcnt + m_colcnt > buf + event_len` wraps around, bypassing the check. Result: heap buffer overflow → crash of the slave SQL/IO thread.

The fix rejects `m_colcnt > event_len` before allocating (same pattern as MDEV-40644), so `is_valid()` returns false and the event is refused gracefully.

## Testing

Arithmetic replica under ASan confirms the overflow without the fix and clean rejection with it.

---
**AI tool use disclosure:** AI was used in part for code audit and patch drafting.
