Closes #6874

> **Draft until I verify it in the pkg.pr.new sandbox and attach a before/after recording.**

## 📝 Description

Stops the Switch thumb from jittering while it slides. The thumb now moves with the `translate` property instead of an animated `margin-inline-start`. Resting positions are unchanged.

## ⛳️ Current behavior (updates)

`.switch__thumb` slides by transitioning `margin-inline-start` from `0.125rem` to `calc(100% - <thumb width + 0.125rem>)`. A margin transition re-runs layout on every frame, and Chromium/Firefox round each edge of the thumb to a device pixel separately. If the thumb is not a whole number of device pixels wide, its painted width flips between two values (for example 27 and 28 px) from frame to frame as it moves, so it wobbles. That covers:

- `sm` (16.5px) and `lg` (27.5px) at 100% zoom with a 16px root,
- `md` (19.25px) with a 14px root,
- browser zoom and fractional device pixel ratios such as 1.25, 1.5 and 2.625 (common on Android).

This lines up with the report: it shows in Chrome desktop/Android and Firefox desktop, and goes away when zoomed far in.

## 🚀 New behavior

- `.switch__control` gets `container-type: inline-size`, so the thumb can measure the track.
- Selected thumb: `translate: calc(100cqi - 100% - 0.25rem) 0`. That's the track width, minus the thumb width, minus the 0.125rem inset on each side. One rule now covers sm/md/lg, so the three per-size `ms-[calc(100%-…)]` overrides are gone.
- RTL flips the travel with `:dir(rtl)`, the same way `scroll-shadow.css` and `avatar-group.css` handle direction.
- The transition is on `translate` instead of `margin`. `motion-reduce:transition-none` stays.

Like the old `calc(100% - …)` margin, the travel follows a custom track width (e.g. `.switch__control { @apply w-8 }` from the docs).

Measured with Playwright (Chromium 153) against `@heroui/styles` compiled before and after, at DPR 1 / 1.25 / 1.5 / 2.625 and 16px / 14px roots. The table shows how far the thumb's painted width varies across the 300ms slide (black track, flat white thumb; max − min, in device px):

| Case | Before | After |
| --- | --- | --- |
| sm, 16px root, DPR 1 | 1 | 0.004 |
| lg, 16px root, DPR 1 | 1 | 0.004 |
| md, 14px root, DPR 1 | 1 | 0.25 |
| lg, 16px root, DPR 1.5 | 1.5 | 0.5 |
| sm, 16px root, DPR 2.625 | 2.63 | 0.004 |
| md RTL, 14px root, DPR 1.25 | 1.25 | 0.004 |

Before, the width jumps by a whole device pixel. After, any variation is sub-pixel anti-aliasing. I also compared the resting thumb rects (off and on; sm/md/lg; LTR/RTL; default, 3.5rem and 1.75rem tracks) before and after. They are identical. The one exception is the degenerate case where the `lg` thumb is wider than a 1.75rem track.

## 💣 Is this a breaking change (Yes/No):

No. This only changes CSS, and every size and direction rests in the same place as before. One caveat: app CSS that positioned the selected thumb by overriding its `margin-inline-start` would now have the new `translate` added on top.

## ✅ Testing

- [x] Interactive / a11y contract changes include or update `*.test.tsx` coverage. New `switch.browser.test.tsx`, since jsdom doesn't paint.
- [x] Scenarios cover roles, `data-*` states, keyboard, disabled, and callbacks as applicable. Not applicable here: no contract changes.
- [x] `pnpm test` passes locally: `@heroui/react` reports 129 files / 712 tests passing (jsdom and browser).

`switch.browser.test.tsx`:
- **Thumb transition** (`sm`, `lg`, RTL `lg`): toggles the switch, pauses the transition every 20ms and measures the painted thumb width from a screenshot. Before this change it fails (`expected 1 to be less than 0.1`). After, it passes.
- **Resting position** (`sm`/`md`/`lg`, RTL, custom 4rem track): the thumb is inset 0.125rem from the leading edge when off and from the trailing edge when on. This passes both before and after, which guards backward compatibility.

`pnpm --filter @heroui/react exec tsc --noEmit`, eslint and prettier on the changed files, and `pnpm --filter @heroui/styles build` all pass.

## 📝 Additional Information

- Browser support: `@heroui/styles` already uses the `translate` property (`drawer.css`), `container-type: inline-size` (`calendar.css`) and `:dir()` (`scroll-shadow.css`, `avatar-group.css`). Container units (`cqi`) are new in this package. They're supported from Chrome 105, Safari 16 and Firefox 110, all older than Tailwind v4's own browser baseline.
- Before/after filmstrips and a slow-motion recording of the `lg` switch at DPR 1 (made headlessly with Playwright) will be attached once I've checked them against the sandbox build.
- AI disclosure: I prepared this fix with AI assistance (Claude Code) and verified it locally with the tests and measurements above. I'll check it again in the pkg.pr.new sandbox before marking it ready.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
