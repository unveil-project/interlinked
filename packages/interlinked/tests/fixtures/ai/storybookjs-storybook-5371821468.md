I triaged this with your repro plus an instrumented control, and the situation turned out subtler than the README describes — the patch **is** broken, but not through the mechanism the grid repro exercises.

**1. The grid repro doesn't isolate the patch.** I ran [storybook-focus-bug](https://github.com/NickyBlissTui/storybook-focus-bug) on a built Storybook 10.4.6 (Playwright, real pointer click on the left grid, then `ArrowRight`), twice:

- **Patched** (accessor present, verified via the property descriptor): focus jumps left grid → right grid. Reproduced.
- **Control** (native `focus` restored with your own workaround via an init script that runs before any module, descriptor verified as a plain data property): focus jumps to the right grid **identically**.

That jump comes from the component pattern itself: `focusmove` makes the parent call `.focus()` on **all** `<focus-grid>` children in document order, and both grids always have a `tabindex="0"` button, so the last call wins — with or without Storybook. (In cally's calendar this pattern works because only the month containing the focused date has a `tabindex="0"` target, so the sibling `.focus()` calls are no-ops.)

**2. But the title's claim is real: the patch does break programmatic focus — through the *setter*.** Because `focus` becomes an accessor on `HTMLElement.prototype`, an ordinary instance assignment (`el.focus = fn` — focus delegation in web components, test doubles, `Object.assign(el, …)`) no longer creates an own property. It invokes the prototype setter, which is an arrow function (so it can't see its receiver) and stores `fn` into the shared `currentFocus`. From then on **every element's `.focus()` invokes that one function**. Measured on the same built 10.4.6 preview:

| probe | patched | native |
| --- | --- | --- |
| `a.focus = fn` creates an own property on `a` | ❌ `false` | ✅ `true` |
| `b.focus()` focuses `b` | ❌ `activeElement` unchanged; `fn` called with `this === b` | ✅ |
| element created afterwards: `c.focus()` | ❌ `fn` called again; `c` never focused | ✅ |

A single instance-level assignment anywhere in a story permanently hijacks programmatic focus for the whole page — which lines up with "programmatic `.focus()` inside shadow DOM stops working" in a real app, even if the minimal grid extraction lost that trigger. The setter is unchanged on current `next` (5f42b3235b), so this isn't fixed by 10.5.8's getter hardening (#35528).

**3. Fix.** Making the setter receiver-aware restores native semantics while keeping the prototype-level interception (capture-and-wrap support) intact: assignments to `HTMLElement.prototype.focus` still go to `currentFocus`; assignments on an element (or subclass prototype) become an own data property scoped to that receiver. Patching exactly that into the built 10.4.6 runtime makes all probes above return the native results.

PR with red-green tests: #36007
