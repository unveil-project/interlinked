Fixes #18531

`createImageSizes` built every configured image size at once with `Promise.all`. Each size pipeline decodes the whole source image, so one upload held one full decoded copy per size at the same time — peak memory of roughly `sizes × width × height × channels`. The reporter's measurements on 3.90.1: a flat 7000×7000 PNG (~320 KB) with four WebP `imageSizes` grew the process by ~591 MB, enough to OOM-kill memory-limited containers, with client retries then taking down the next replica.

This builds the sizes one at a time, so peak usage stays at roughly one decoded copy (~162 MB in the reporter's sequential measurement). Results are also collected in config order instead of completion order.

Red → green: a new unit test in `createImageSizes.spec.ts` instruments the sharp pipelines and counts how many `toBuffer` calls are in flight at once. On the unpatched code all 3 configured sizes run concurrently (max in flight = 3, test fails); with this change the max is 1 and the full spec passes (3/3, `vitest run --project unit`). Prettier clean.

---
Tips welcome: PayPal kyleblake0659@gmail.com · BTC 3GnR7TWBXAB3pPztBWpNF4LMNEX5yX8vZK · GitHub @Kshot3000 · X @kshot9000