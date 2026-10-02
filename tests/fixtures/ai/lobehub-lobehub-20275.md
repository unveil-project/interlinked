### Summary

Contribution source: AI-assisted

Home's first-screen pane now scrolls with `@lobehub/ui/base-ui` `ScrollArea` instead of native `overflow-y: auto`. The dashboard still scrolls as one page at full pane width. The overlay track starts at the 44px action bar's bottom edge so it does not run through the customize and rail controls. The viewport is not a tab stop, so focus does not ring the whole dashboard.

#### Test

- [ ] Tested locally
- [ ] Added/updated tests
- [x] No tests needed

Lint on the changed file is clean. Whole-page Home scroll (main column and rail move together, scrollbar against the pane edge) is already covered by e2e `HOME-LAYOUT-RAIL-001`. This change only swaps the scroll chrome.

- Acceptance: skipped — scrollbar widget chrome on an already-covered whole-page scroll layout; no product-behavior change to how Home content scrolls.

#### 🔗 Related Issue

None.
