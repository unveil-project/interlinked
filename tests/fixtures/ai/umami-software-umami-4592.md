Fixes #4578.

Umami picks the clock format from the UI language: `formatDate` in `src/lib/date.ts` and `formatTimezoneDate` in `src/components/hooks/useTimezone.ts` pass the date-fns locale to `format`, so an `en-US` user always gets `1:05 PM` and a `de-DE` user always gets `13:05`, with no way to choose separately.

This adds a Time format preference (Language default / 12-hour / 24-hour) to Settings, Preferences and to the dashboard preferences popover, stored client-side under `umami.timeFormat` exactly like the existing timezone preference (`TIME_FORMAT_CONFIG`, store state in `src/store/app.ts`, no schema change). `setHour12` in `src/lib/lang.ts` overrides `formatLong.time` on the date-fns locale, so every localized time token (`p`, `pp`, `PPpp`, `PPPpp`) honors the choice through one choke point: chart axis labels and tooltips (`renderDateLabels`, `BarChart`), annotations, realtime log, session activity, error pages, and date tooltips. The hour axis of the weekly traffic heatmap (`WeeklyTraffic`), which was hardcoded to `haaa`, switches to `H` when 24-hour is forced. "Language default" keeps today's behavior byte for byte, so existing users see no change.

One tradeoff: already-rendered chart axis labels refresh on their next data render rather than instantly on toggle; tooltips and any newly mounted views pick the format up immediately. Keeping the diff this small seemed worth it; wiring reactivity through every chart component is easy to do later if you want it.

Verification (Node 24, pnpm 12.3.4):

```
$ npx vitest run src/lib/date.test.ts src/lib/lang.test.ts
Test Files  2 passed (2)
      Tests  88 passed (88)

# new "formatDate clock format" block on pristine upstream (src change stashed):
$ npx vitest run src/lib/date.test.ts
src/lib/date.test.ts (82 tests | 4 failed)   <- TypeError: setHour12 is not a function
# restored: 4/4 pass

$ npx vitest run
Test Files  1 failed | 126 passed (127)
      Tests  962 passed (962)
# the 1 failing file (src/app/mcp/route.test.ts, unresolved @umami/api-client
# workspace import) fails identically on pristine upstream/dev: verified by
# stashing the change and re-running, same single failure.

$ npx tsc --noEmit -p tsconfig.json
# 9 error lines, all in untouched files (EventsTable, mcp route, 2fa test);
# byte-identical output on pristine upstream/dev (diff clean)

$ npx biome check <9 touched files>
Checked 9 files in 14ms. No fixes applied.

# store -> lang -> formatDate wiring, end to end (tsx scratch script):
initial store timeFormat: auto
default (auto) en-US p : 1:05 PM
after '24h': 24h -> p: 13:05 | pp: 13:05:09 | PPpp: Oct 1, 2026, 13:05:09
after '12h': 12h -> de-DE p: 1:05 nachm. | en-US pp: 1:05:09 PM
after 'auto': auto -> en-US p: 1:05 PM | de-DE p: 13:05
```

The full app was not booted: `next dev` requires a configured Postgres (`DATABASE_URL`, `prisma migrate`) which this environment does not have, so the Preferences UI was not screen-verified. The Select/ListItems mirror `LanguageSetting.tsx` and `TimezoneSetting.tsx` component for component.

Labels are en-US only; other locales fall back per the existing missing-key mechanism (`useLocale` merges en-US, `check-missing-messages.js` reports them like every other recent addition).

Prepared with AI assistance (GLM 5.3 via Oh My Pi) and reviewed before submission.

<!-- codesmith:footer -->
---
<a href="https://app.blacksmith.sh/umami-software/codesmith/umami/pr/4592?autoLogin=true&ref=codesmith_pr_footer"><picture><source media="(prefers-color-scheme: dark)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-dark-v2.svg"><source media="(prefers-color-scheme: light)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-light-v2.svg"><img alt="View with [code]smith" src="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-dark-v2.svg"></picture></a> <a href="https://backend.blacksmith.sh/track/enable-autofix?expires=1793491507&installation_model_id=22160&pr_number=4592&ref=codesmith_pr_footer&repository=umami-software%2Fumami&return_to=https%3A%2F%2Fgithub.com%2Fumami-software%2Fumami%2Fpull%2F4592&signature=9d5b5edd0689170c952b862fcd6515f7d2cb0699f1b6971ad79abcb418285188"><picture><source media="(prefers-color-scheme: dark)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-light.svg"><img alt="Autofix with [code]smith" src="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-dark.svg"></picture></a>
<sup>Need help on this PR? Tag <code>@codesmith-bot</code> with what you need. Autofix is disabled.</sup>

<!-- codesmith:autofix:disabled -->
<!-- /codesmith:footer -->
