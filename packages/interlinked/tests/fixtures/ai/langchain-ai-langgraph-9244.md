## Summary

When an application has multiple distinct local Python packages that share a directory name (e.g. three real packages named `shared`), `config_to_docker` can silently omit a package from the generated Dockerfile.

## Root cause

In `_assemble_local_deps`, the collision counter is incremented under the *renamed* container name:

```python
container_name = resolved.name
if counter[container_name] > 0:
    container_name += f"_{counter[container_name]}"
counter[container_name] += 1
```

For the third same-named package, `counter["shared"]` is still 1 (the second package incremented `counter["shared_1"]` instead), so it is again named `shared_1`. `register_additional_context` then re-derives a different name (`shared_1_1`) for the build context, while the Dockerfile `COPY --from=shared_1` line references the already-used context — so the third package's files are never copied and runtime/graph paths can point at the wrong destination.

## Change

Count collisions under the original directory name so each same-named package gets a stable, unique destination (`shared`, `shared_1`, `shared_2`, ...). Context registration and `COPY --from=` references now agree for any number of same-named local packages.

## Verification

- Reproduced on main with the issue's script: 3 packages named `shared` → contexts {`shared`, `shared_1`, `shared_1_1`} but `COPY --from=shared_1` twice, `shared_1_1` never copied.
- After the fix: contexts and COPY lines are exactly {`shared`, `shared_1`, `shared_2`}, each copied once. Verified for 2–5 same-named packages.
- `python -m py_compile` passes; `libs/cli/tests/unit_tests` 22 passed / 1 pre-existing failure unrelated to this change (fails on main too).

Fixes #9242