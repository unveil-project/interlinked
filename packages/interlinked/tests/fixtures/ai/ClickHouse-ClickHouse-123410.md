Related: https://github.com/ClickHouse/ClickHouse/pull/119559

<!--
Linked issues and pull requests. Use full GitHub URLs, one relationship per line; delete the lines you don't need.

Closes: https://github.com/ClickHouse/ClickHouse/issues/NNNNN   (auto-closes the issue when this PR is merged into the default branch)
Related: https://github.com/ClickHouse/ClickHouse/pull/NNNNN
-->


### Changelog category (leave one):
- CI Fix or Improvement (changelog entry is not required)


### Changelog entry (a [user-readable short description](https://github.com/ClickHouse/ClickHouse/blob/master/docs/changelog_entry_guidelines.md) of the changes that goes into CHANGELOG.md):
Not required (test-only change).

### Description

`05185_readonly_toggle_loads_outdated_parts` and `05218_readonly_toggle_window_keeps_outdated_parts_unloaded` (both from #119559) insert two parts, merge them with `OPTIMIZE FINAL`, run `TRUNCATE`, and then expect exactly two outdated non-empty parts after the `table_readonly` toggle. That holds only if `TRUNCATE` deleted the merged part `all_1_2_1`, as the tests' comment claims. The deletion is best-effort: a MergeTree `TRUNCATE` takes only a share lock, and its in-query `clearOldPartsFromFilesystem()` skips a part that another query still references (`removal_state` = `Part ownership is not unique`), or removes nothing while the cleanup thread holds `grab_old_parts_mutex`. Three outdated parts are then loaded, and 05185 prints `1	0` instead of `1	1`.

It failed once in ClickHouse's private CI (debug, object storage, parallel). Public CIDB has no failure of 05185 in ~37k runs over 60 days, so there is no public report to link; the reproducer below gives the exact diff.

Fix (tests only): record the outdated parts before `DETACH` and require the toggle to load the same set, so the merged part is checked whenever `TRUNCATE` left it on disk. Both tests also still require the two inserted parts (`level = 0`), which `old_parts_lifetime = 3600` and `SYSTEM STOP CLEANUP` keep in every run, and the comment is corrected.

Validation: with a concurrent `mergeTreeIndex()` query holding `all_1_2_1` across `TRUNCATE`, the old predicate prints `1	0`; the new check finds `all_1_2_1` both before `DETACH` and after the toggle and passes (3/3), as it does without the holder. Deleting `all_1_2_1` from disk while the table is detached fails the new check (`1	1	0`), and so does deleting the `table_readonly = 0` toggle in either test. 100 randomized runs of 05185 and 20 of 05218 pass.

<details>
<summary>Reproducer</summary>

```bash
# in a fresh database, after the test's CREATE / STOP CLEANUP / 2x INSERT / OPTIMIZE FINAL:
clickhouse client -q "SELECT sleep(2.5) FROM mergeTreeIndex(currentDatabase(), 'readonly_outdated') FORMAT Null" &
sleep 1
clickhouse client -q "TRUNCATE TABLE readonly_outdated"
clickhouse client -q "SELECT name, removal_state FROM system.parts
    WHERE database = currentDatabase() AND table = 'readonly_outdated' AND NOT active"
#   lists: all_1_2_1   Part ownership is not unique
wait
# then the rest of the test body (readonly toggle, DETACH/ATTACH, toggle back):
#   countIf(NOT active AND rows > 0) = 3                 -> old predicate 0
#   the same 3 names before DETACH and after the toggle  -> new check 1
```

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

<!-- CI automatic block start :ci_links: -->

---
Workflow [[PR](https://s3.amazonaws.com/clickhouse-test-reports/praktika.html?PR=123410&sha=latest&name_0=PR)]
Sync PR [[sync-upstream/pr/123410](https://github.com/search?q=head%3Async-upstream%2Fpr%2F123410+org%3AClickHouse+type%3Apr&type=pullrequests)]
<!-- CI automatic block end :ci_links: -->



<!-- ch-version-info:start -->
### Version info
- Merged into: `26.10.1.1289-master` (included in `26.10` and later)
<!-- ch-version-info:end -->
