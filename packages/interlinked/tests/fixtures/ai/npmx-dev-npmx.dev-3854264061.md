Great point @danielroe! You're absolutely right - fixing the case at the source (link generation) is the better approach. This ensures:

1. Native browser hash navigation works correctly (no JS interception needed)
2. Direct URL visits with hash fragments work (e.g., sharing links)
3. The code is simpler - we just trust the browser's native behavior

I've updated the PR:
- Added `.toLowerCase()` in `server/utils/readme.ts` line 195 when generating anchor hrefs
- Simplified the client-side handler to just return for hash links, letting the browser handle them natively
- Updated tests to reflect the new behavior

Thanks for the feedback!
