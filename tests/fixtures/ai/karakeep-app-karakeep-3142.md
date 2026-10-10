Closes #1273

## What this does

Adds a "Screenshot and send to Karakeep" item to the browser extension's right-click context menu (page context). It captures the visible page as a PNG, uploads it as an image asset, and creates an ASSET bookmark from it, implementing the exact flow the maintainer approved in the issue thread: *"add an item to the context menu that says 'Screenshot and send to Karakeep'"*.

The existing SavePage popup UI already renders ASSET bookmarks (title, filename, notes), so no new UI was needed there.

## Why capture+upload happens in the popup, not the background script

Capturing and uploading are both async (a browser API call and a network request). Awaiting them in the background script before calling `chrome.action.openPopup()` would lose the user-gesture context Firefox requires to open the popup. So the background script only flags the intent via a new `chrome.storage.session` key (`SCREENSHOT_PENDING_KEY_NAME`) and opens the popup immediately -- the same pattern the existing "Add to Karakeep" menu item already uses. The popup (`SavePage`) then does the actual `chrome.tabs.captureVisibleTab` capture and upload once it's open, reusing the active-tab resolution it already does for every other save path.

## Refactor

The asset-upload logic (FormData POST to `/api/assets` with the configured apiKey/customHeaders) was previously inlined in `uploadSingleFileAsset` for the SingleFile archive feature. It's extracted into a shared `uploadAssetFile()` + `sanitizeFilename()` helper in a new `utils/assetUpload.ts` so both SingleFile and the new screenshot path use the same, already-proven upload code instead of duplicating it.

Manifest permissions are unchanged -- `contextMenus` and `activeTab` were already present and are what `tabs.captureVisibleTab` needs.

## How this was verified

This repo has no existing frontend test harness for the extension (no vitest/playwright setup under `apps/browser-extension`), so I verified as follows:

- `pnpm typecheck` / `pnpm lint` (oxlint) / `pnpm format` (oxfmt) all pass clean for `@karakeep/browser-extension`.
- `pnpm build` produces a valid unpacked extension. I loaded it in a real Chromium via Playwright with the manifest's existing `contextMenus`/`activeTab`/`tabs` permissions and confirmed the service worker starts without errors (`registerContextMenus()` runs cleanly with the new menu item registered).
- I exercised the actual compiled popup flow end-to-end against a real HTTP test page with `/api/assets` and the tRPC endpoint network-mocked: confirmed the new `SCREENSHOT_PENDING_KEY_NAME` flag is correctly picked up by `SavePage`, and that the pre-existing guard logic (no active tab / non-HTTP page) correctly blocks and reports an error instead of silently mis-bookmarking, through the actual compiled code rather than just source review.
- `chrome.tabs.captureVisibleTab` itself requires a tab made active by a genuine user gesture (the `activeTab` permission grant), which Playwright cannot simulate for a native context-menu click, so I could not exercise that one specific Chrome API call end-to-end in an automated test. The surrounding logic (which tab/window to capture, how the result is uploaded and turned into a bookmark) is fully covered by the above.

## AI disclosure

This change was developed with AI assistance (Claude). The architecture (deferring capture/upload to the popup to preserve the Firefox user-gesture requirement), the ASSET bookmark construction, and the shared-upload-helper refactor were reviewed by me against the existing SingleFile capture flow and the already-shipped "Add to Karakeep" context-menu handler, which this closely follows.