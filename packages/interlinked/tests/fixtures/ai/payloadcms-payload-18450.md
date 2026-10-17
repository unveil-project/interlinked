## Summary of Changes

Uploading a **WebP, GIF, or TIFF** to a collection with `upload: true` and **no image
options** (no `resizeOptions`, `formatOptions`, `trimOptions`, `imageSizes`, or custom
`constructorOptions`) silently re-encodes the file at sharp's defaults (quality 80,
no colour profile), discarding up to ~50 % of file size and destroying the colour space.
Each subsequent duplicate degrades the file further. JPEG and PNG are unaffected.

## Root Cause / Technical Context

`packages/payload/src/uploads/generateFileData.ts` (line 263):

```ts
if (sharp && fileHasCompleteContents && (fileIsAnimatedType || fileHasAdjustments)) {
```

`fileIsAnimatedType` is `true` for WebP, GIF, and TIFF, so those files **always** enter
the sharp pipeline and are toBuffer'd with sharp's defaults — even when the collection
requests no changes whatsoever. The `fileHasAdjustments` guard (added by #11612 to let
users "upload without compression") never applies to animated types because the `||`
short-circuits it.

The `fileIsAnimatedType` branch was introduced by #6708 to supply `animated: true` to
the sharp constructor so that the crop code can later call `sharpFile.metadata()`.
There is no reason to call `toBuffer()` when there are no adjustments to apply.

## Changes — `packages/payload/src/uploads/generateFileData.ts`

1. **Split the condition** — the encode pipeline now enters only when
   `fileHasAdjustments` is true. The inner `if (fileHasAdjustments)` guard is removed
   (it was always true in the surviving branch).

2. **Read animated metadata separately** — a new `animatedOnlyMetadata` path creates a
   metadata-only sharp instance for animated files without adjustments. This preserves
   the multi-frame `pages` field used for height correction, without ever calling
   `toBuffer()`.

3. **Height correction in the else branch** — when `animatedOnlyMetadata.pages` is set
   the stored `height` is divided by `pages`, matching the existing behaviour in the
   sharpFile branch (line 306-308).

## Verification & Testing

Reproduce with the reporter's test suite:
```bash
git clone https://github.com/franknoel/payload-webp-gif-recompressed
cd payload-webp-gif-recompressed
cp .env.example .env   # fill DATABASE_URL + PAYLOAD_SECRET
pnpm install
pnpm check
```

Expected output after fix:
```
same bytes  photo.jpg       upload     ✓
same bytes  photo.jpg       duplicate  ✓
same bytes  photo.webp      upload     ✓  (was RE-ENCODED)
same bytes  photo.webp      duplicate  ✓  (was RE-ENCODED)
same bytes  animation.gif   upload     ✓  (was RE-ENCODED)
same bytes  animation.gif   duplicate  ✓  (was RE-ENCODED)
same bytes  animation.webp  upload     ✓  (was RE-ENCODED)
same bytes  animation.webp  duplicate  ✓  (was RE-ENCODED)
```

- Collections **with** `resizeOptions`/`formatOptions`/`trimOptions` are unchanged.
- Crop workflow (`cropData`) still receives `sharpFile` via the `cropData && ...` branch.
- Colour profiles, quality, and animation frames are preserved.

Fixes #18386
