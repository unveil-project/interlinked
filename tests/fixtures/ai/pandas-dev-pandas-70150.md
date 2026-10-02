`DataFrame`/`Series`/`NDFrame` docstring corrections collected from reviewing merged PRs. Each claim below was checked by running it on main.

- Flex ops (GH-63771): `, \` continuations in 23 `DataFrame`/`Series` flex-op summaries (`le`, `ge`, `mul`, `truediv`, ...) left a 9-space run mid-sentence in `help()` output. They are single lines again. Removing the backslashes lets ruff format the docstring examples, which accounts for most of the diff size.
- Reductions (GH-65634, GH-64984, GH-64182, GH-63625):
  - Stale `axis=None` deprecation warnings removed from `sum`/`prod`/`var`/`sem`/...
  - `DataFrame.sem` Returns can be a scalar.
  - `count`, `std`, `skew` and the `mean`/`median` extended summaries.
  - Missing `isnull`/`notnull` See Also entries restored.
- `any`/`all` `skipna` (GH-65620): now separates NaN/NaT, None and `pd.NA`. The `Series.dt.to_timestamp` API page is added.
- `describe` (GH-65659): the `include=None` default analyzes tz-naive datetime and timedelta columns and falls back to all columns. Fixed for frame, Series and groupby.
- `select_dtypes`:
  - the example outputs are restored to the real repr.
  - Notes: `object` also matches `str` columns, which is deprecated.
  - Raises: the `Decimal` and `'period'` errors are listed.
- `assign` (GH-64998, GH-65621): the alignment rules are stated directly, and the dict example shows both NaN-filling and ignored keys.
- `replace` (GH-64850): `True`/`1` match only in object dtype, and missing values match as missing.
- `copy` (GH-64226): `copy.deepcopy` on a pandas object is *not* recursive either.
- `stack` (GH-63860): `dropna`/`sort` are only valid with `future_stack=False`.
- `sort_values`/`sort_index` `kind` (GH-65986): dropped the "deterministic" sentence.
- `Series.values` (GH-69452): the deprecation is 3.1.0, with tz-aware guidance.
- Extended summaries and Notes for `where`, `apply`, `compare`, `at_time`, `pop`, `__iter__`, `convert_dtypes`, `to_frame`, `value_counts`, `to_html`, `to_markdown`, `nlargest`/`nsmallest` and `ffill` (GH-63752, GH-64034, GH-64125, GH-64236, GH-64246, GH-64295, GH-64362, GH-65142).
- `to_excel` (GH-65538): `engine` lists `'odf'` for .ods.
- `to_json` (GH-66562): `orient='table'` data layout.
- `to_pickle` compression (GH-63552): the text names `path`.
- `get` (GH-64981): a duplicated example is removed.
- `merge` (GH-63821) and `melt` (GH-63869) example output.
- `compare` (GH-64479): Returns text.

AI disclosure: drafted with Claude Code (`claude opus 5.5 (high)`), which found the errata, made and verified the edits, and wrote this description.

