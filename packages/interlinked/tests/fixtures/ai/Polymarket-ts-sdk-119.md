The CLOB API returns `""` (empty string) for certain decimal-typed fields in specific lifecycle states. py-sdk normalizes these; ts-sdk passes `""` through as a `DecimalString`, so a consumer doing `Number("")` gets `0`, `parseFloat("")` gets `NaN`, and `Decimal()`/`BigNumber()` constructors throw.

Two fields, both proven by py-sdk's own validators + tests:

1. **Order `makingAmount` / `takingAmount` on a live GTC order** come back as `""`. py-sdk `RawOrderResponse` maps `"" -> "0"` (`_empty_string_to_zero`). ts-sdk `RawOrderResponseSchema` / `AcceptedOrderResponseSchema` use bare `DecimalStringSchema` and emit `makingAmount: "" as DecimalString`.
2. **`MakerOrder.fee_rate_bps`** comes back as `""`. py-sdk `MakerOrder` maps `"" -> None` (`_empty_to_none`, field is nullable). ts-sdk `MakerOrderSchema.fee_rate_bps` uses bare `DecimalStringSchema`. (py-sdk does **not** normalize the top-level `ClobTrade.fee_rate_bps`, so only the maker entry is affected - left unchanged here to match.)

## Proposed fix (matches py-sdk semantics + the repo's existing `z.preprocess` idiom)

```diff
diff --git a/packages/bindings/src/clob/order-response.ts b/packages/bindings/src/clob/order-response.ts
+const EmptyStringToZeroDecimalSchema = z.preprocess(
+  (v) => (v === '' ? '0' : v),
+  DecimalStringSchema,
+);
+
 export const RawOrderResponseSchema = z.object({
   errorMsg: z.string(),
-  makingAmount: DecimalStringSchema,
+  makingAmount: EmptyStringToZeroDecimalSchema,
   orderID: z.string(),
   status: z.string(),
   success: z.boolean(),
-  takingAmount: DecimalStringSchema,
+  takingAmount: EmptyStringToZeroDecimalSchema,

diff --git a/packages/bindings/src/clob/account.ts b/packages/bindings/src/clob/account.ts
   .object({
     asset_id: TokenIdSchema,
-    fee_rate_bps: DecimalStringSchema,
+    fee_rate_bps: z.preprocess((v) => (v === '' ? null : v), DecimalStringSchema.nullable()),
```

## Tests + local verification
Added `packages/bindings/src/clob/order-response.test.ts`:
- A live-GTC raw order (`success: true, errorMsg: "", status: "live", makingAmount: "", takingAmount: ""`) -> `makingAmount`/`takingAmount` normalize to `"0"`.
- A `MakerOrder` with `fee_rate_bps: ""` -> `feeRateBps` is `null`; `"25"` stays `"25"`.

Results:
- New tests fail on `main` (assertion: `"" !== "0"`, `"" !== null`) and pass with the change.
- Full suite green: bindings 13 + client 123 tests, 0 regressions.
- typecheck clean across all packages.

External PRs look restricted on this repo, so the patch is inline. Full change (with tests) on a branch for easy cherry-pick: `Nexory:ts-sdk@fix/empty-string-decimals`. Happy to adjust.
