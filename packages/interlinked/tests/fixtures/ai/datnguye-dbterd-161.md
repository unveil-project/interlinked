### Describe the bug

The documented list-valued `relax-policies` configuration is converted into a Python-list-shaped string by Click before reaching the executor. Both a populated list and the documented empty list for strict validation fail artifact loading.

Reproduced on main `a2ce73de76306545cbff1e540f9d44db80ce1e78`, Python 3.13 / Click 8.5.0, with entirely authored valid manifest v12/catalog v1 artifacts (three small models; no database/dbt execution).

```yaml
# .dbterd.yml
artifacts-dir: ./tiny
output: ./output
relax-policies:
  - relax_extra_fields
  - relax_enum_values
```

Run `dbterd run` (with an existing output directory). It reports that manifest.json is corrupted. `dbterd debug` reveals:

```json
{"relax_policies": "['relax_extra_fields', 'relax_enum_values']"}
```

`relax-policies: []` similarly becomes the string `"[]"` instead of an empty list. `_resolve_validation_policies` already accepts real lists, but receives the coerced string and attempts to resolve nonexistent policy names.

Expected: config lists reach the executor unchanged; CLI comma-separated strings and `--relax-policies ""` continue to override config normally.

I have a two-line option-type fix covering `run` and `debug`, with regression tests and end-to-end local artifact generation.
