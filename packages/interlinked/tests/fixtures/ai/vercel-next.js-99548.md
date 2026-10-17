## Summary

Make “Latest” comparisons and current-build views read the newest saved snapshot instead of mutable `/data` files. Previously, a cached `/data` response could show no changes against an older baseline even though selecting the newest snapshot showed the real difference.

Revalidate only the small `history/history.json` index with browser `cache: 'no-cache'` on load and tab focus, then use its newest existing snapshot ID for normally cacheable `/history/<id>/…` JSON and binary data. Keep the picker consistent with that same ID and load the required history index through Suspense before reading snapshot data.

This works for disk exports without assuming control over the serving server's cache headers. A host/CDN that disregards HTTP revalidation remains outside the UI's control.

## Verification

- Two real analyzer builds in Chromium: refreshing the index changes the old-baseline → Latest comparison from zero to the same diff as explicitly choosing the newest saved snapshot. The same-page historical → Latest toggle reuses the resolved ID without an extra index request.
- Browser request checks: only the index forces revalidation; versioned JSON/binary requests keep normal caching.
- Browser checks for summary, single-build route picker, newest-ID exclusion, and one-snapshot “No prior builds yet.” A missing index reaches the existing error UI without reading `/data`.
- Existing analyzer CLI e2e cases remain passing; the extended suite passes 5/5. Repository/app types, focused lint/format, and compiler-enabled production export pass.

<!-- NEXT_JS_LLM -->


<!-- fleet d4ca0cb7-1e23-4f73-ac4e-5a6271239015 -->

