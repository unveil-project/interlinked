In the "Open View" quick access (run `View: Open View`, or the `view` prefix in Quick Open), an entry matches the filter if either its view label fuzzy-matches (case-insensitive) or its container label matches via `fuzzyContains(entry.containerLabel, filter)`. The container-label path is case-sensitive, so filtering by a container name only works in lowercase.

Steps to reproduce:
1. Run "View: Open View".
2. Type `explorer`. Views grouped under the Explorer container (e.g. Outline, Timeline) appear, matched by their container label.
3. Type `Explorer` (capital E, as the UI displays the container). Those entries drop out.

Expected: matching by container name is case-insensitive, so `Explorer` and `explorer` return the same views.

Actual: any uppercase character in the query fails to match the container label, so typing the container name as displayed returns fewer results than the lowercase form.

Root cause: `fuzzyContains` in `src/vs/base/common/strings.ts` lowercases the target but compares it against the original-case query characters. The other two callers (Test Explorer filter, file search) pre-lowercase the query before calling, which is why the defect only surfaces in Open View.

A fix is up at #324047.
