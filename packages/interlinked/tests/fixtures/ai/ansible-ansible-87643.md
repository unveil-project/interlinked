##### SUMMARY
Fixes #86947

Lazy dict and list constructors now return native containers when passed ordinary iterables, and lazy tuple constructor does likewise
This supports dataclasses.asdict and dataclasses.astuple reconstruction without raising UnsupportedConstructionMethodError
Internal _LazyValueSource construction and same-type lazy copies retain existing laziness, templar, options, and tagging behavior
Implementation changes 5 files including unit regression tests, actual filter integration tests, and changelog fragment without caller-stack inspection, monkey-patching, or API additions

##### ISSUE TYPE
- Bugfix Pull Request

##### TESTING
Testing performed locally using Docker with Colima; GitHub CI has not been run yet

- Unit tests:
  - Focused lazy-container suite: 189 passed (regression before fix: 20 failed, 165 passed)
  - Related suites command:
    ansible-test units test/units/_internal/templating/ test/units/module_utils/datatag/ test/units/template/ --docker default --python <version> --num-workers 4
    Passed on Python 3.13, 3.14, and 3.15 with 1007 passed and 13 existing xfails each

- Integration tests:
  - Original issue playbook verified failed for both list and dict before fix and succeeds for all three tasks after fix
  - Integration command:
    ansible-test integration templating --docker default --python <version>
    Passed on Python 3.13 and 3.14 with 53 successful tasks, zero failures, and 13 intentional negative tests ignored

- Sanity tests:
  - Sanity command:
    ansible-test sanity lib/ansible/_internal/_templating/_lazy_containers.py test/units/_internal/templating/test_lazy_containers.py test/integration/targets/templating/filter_plugins/dataclass_filters.py test/integration/targets/templating/tasks/main.yml changelogs/fragments/86947-dataclasses-lazy-containers.yml --docker default --allow-disabled --base-branch devel
    All 61 applicable sanity variants passed including format, pylint, mypy, import/compile compatibility, changelog, and package-data
    Package-data ran on supported Python 3.13 and 3.15, and skipped on unsupported 3.10, 3.11, 3.12, 3.14

- Git diff check passed
