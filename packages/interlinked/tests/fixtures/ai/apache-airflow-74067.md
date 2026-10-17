Stack (bottom to top): #73970, #73971, #73972, #73973, #73974, #73975, #73976, #73977, #74030, #74031, #74032, #74033, **#74067**

## Why

The Dag-file parse will check each `@task.stub` task against the task handlers its coordinator's artifacts register ([ADR-0013](https://github.com/apache/airflow/blob/main/airflow-core/adr/lang-sdk/0013-persisted-task-handler-bindings.md) Flow 1, step 7), so a missing handler or an argument a handler cannot take fails the Dag file's import instead of the task on a worker. The ADRs still required a Dag's stub task ids to match its handler ids exactly. One artifact registers handlers for many Dag files, so a handler with no stub task is expected, and a stub task only runs on the coordinator its queue routes to. This PR adds the checks as pure functions and fixes the ADRs. Nothing calls the checks yet; a later PR wires them into `_parse_file`.

## What changes

```python
stub_tasks = collect_stub_tasks(bag.dags.values(), serialized_dags)
match = match_task_handlers(
    go_stub_tasks,  # those of stub_tasks routed to one coordinator
    answers,  # the recorded and probed TaskHandlerArtifacts of its bundle
    bundle_name="go-task-handlers",
    broken_candidates={"bin/old": "bin/old is not executable"},
)
match.bindings  # a TaskHandlerBinding for each stub task with exactly one handler
match.warnings  # name mismatches under named binding, for the parse log
format_import_errors(match.problems)
# {"dags/etl.py": "Stub tasks in dags/etl.py do not match their task handlers:\n"
#                 "- Dag 'etl', task 'load': no artifact in Dag bundle 'go-task-handlers' registers it; "
#                 "no answer from 'bin/old' (bin/old is not executable)\n"
#                 "- Dag 'etl', task 'transform' ('bin/etl' in Dag bundle 'go-task-handlers'): "
#                 "argument 'count' is integer or null, the task handler takes integer"}
```

- **Handlers.** Each stub task needs exactly one handler among its coordinator's answers. None, or two artifacts registering it, is a problem. A handler with no stub task is not.
- **Arguments**, mirroring how the Go and Java runtimes bind them. A defaulted argument, filled from the stub signature's default, is type-checked when it binds and is never reported as unmatched. An argless call passes no arguments.

| Declaration | Import error | Parse-log warning |
|---|---|---|
| `positional` | The count, unless all arguments or those without defaults number the params. A value type the param at the same position does not accept. | none |
| `named` | A value type the matched param does not accept. | A passed argument no param takes, and a param no argument fills. Nothing when the argument may be the whole value: no param matched, one argument was passed, the handler has params and none matches only by its exact name, and the argument may be an object. |
| `params=None`, or a mapped stub task | none, only the handler's presence | none |

- **Names** under `named`: a param takes the argument of its exact name, else, unless `exact_name` is set, the one whose name folds to its own (lower case, `_` removed). A folded name two arguments share matches neither.
- **Schemas**, only where both sides have one, compared as the Go runtime compares them: an argument that may be null needs a param that accepts null, and at least one of the argument's other top-level JSON types must be one the param accepts, with `integer` accepted by `number`. So `int | str` binds to an integer param and `int | None` does not. Types come from `type`, `anyOf`/`oneOf`, or `const`/`enum` values. Any other shape, such as `$ref`, is not compared, and neither are `format`, ranges or nested items.
- **Stub tasks.** `collect_stub_tasks` reads the arguments from the serialized Dag as JSON, so they are what the worker gets: a tuple becomes a list, and a dict key a string. A stub task with no queue of its own runs on the default queue.
- **ADRs.** ADR-0011's Step 5 and Appendix B and ADR-0013's Flow 1 step 7 state these rules, and ADR-0012 no longer unions answers across coordinators.

## How to test

```bash
uv run --project airflow-core --with-editable shared/secrets_masker pytest airflow-core/tests/unit/dag_processing/test_task_handler_validation.py -q
```

Ran:

- `test_task_handler_validation.py`: 71 passed.
- The tests fail without the change: the test module cannot import without the new module. Removing one rule at a time fails the tests for that rule: defaulted arguments, name folding, `integer` into `number`, the any-type union rule, the mapped skip, the whole-value exception and its limits, the JSON round-trip of the arguments, the default queue, and the problem and file order.
- `prek run --files` on the changed files, `prek run --from-ref <parent> --stage pre-commit` and `mypy-airflow-core` on all files passed.

---

##### Was generative AI tooling used to co-author this PR?

- [X] Yes (please specify the tool below)

Generated-by: Claude Code (Opus 5.5) following [the guidelines](https://github.com/apache/airflow/blob/main/contributing-docs/05_pull_requests.rst#gen-ai-assisted-contributions)
