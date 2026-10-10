Passing a supported in-memory pdfplumber.PDF object to a PDF feature currently sends its stream object to BytesIO.write(), raising TypeError. This breaks Dataset.from_dict()/map() for PDF objects that have already been opened or read.

Read the original stream from offset zero and restore its original position in a finally block. Keep ownership of the caller stream: do not close it. Cover offsets zero and nonzero, repeated encoding, and the actual Dataset APIs.

Verification

Four actual in-memory PDF regression cases fail on the untouched base and pass on this branch. The complete PDF file has 13 passed / 1 failed (the existing Column-versus-list assertion), so this file is not wholly green. Complete features unit: 532 passed / 1 identical baseline failure / 1 deselected; 19.092 s, exit 1. Clean base features: 528 passed / 1 same failure / 1 deselected; 14.231 s, exit 1.

Full repository unit: 3783 passed / 20 failed / 5 skipped; 272.668 s; exit 1. Clean main 9e7496a4: 3779 passed / 20 failed / 5 skipped; 245.992 s; exit 1. The complete failure-node set and normalized exception signatures are identical; zero new failures.

Executed with the reused project CPython 3.12.8, branch src on PYTHONPATH, PYSPARK_PYTHON/PYSPARK_DRIVER_PYTHON set to the same interpreter, private caches, and HF_HUB_OFFLINE=1/HF_DATASETS_OFFLINE=1 for the complete run. The local Python launcher only appends an existing read-only pdfplumber dependency directory before running pytest. Exact pytest argv:

```sh
python -m pytest -rfExX -m unit -n 2 --dist loadfile -sv ./tests/ --basetemp=.acceptance_cache/pytest-full-repo-runtime-fixed -o cache_dir=.acceptance_cache/pytest-cache -o tmp_path_retention_policy=failed
```

Read-only supplement with the original local-mock and small official Hub metadata tests: {"passed":22}; 13.285 s; exit 0. HTTP writes were prohibited by the private verification wrapper. This does not replace the original complete unit result.

This supplementary check is a serial targeted subset, not a second whole-repository run. The same private CPython3.12.8 wrapper and unchanged original test nodes were used on clean main and all five branches. It sets HF_HUB_OFFLINE=0/HF_DATASETS_OFFLINE=0 only for these read-only checks, disables implicit tokens, permits official GET/HEAD requests, and rejects HTTP writes. Exact argument structure (the private wrapper source is outside this PR):

```sh
python <private_readonly_gate.py> -q -m unit tests/test_file_utils.py::test_get_from_cache_fsspec tests/test_download_manager.py::test_download_manager_download tests/test_load.py::test_load_dataset_with_storage_options tests/test_load.py::test_load_dataset_with_storage_options_with_decoding tests/test_load.py::test_load_dataset_builder_with_metadata_configs_pickable tests/test_load.py::test_load_dataset_builder_fail tests/packaged_modules/test_folder_based_builder.py::test_data_files_with_different_levels_no_metadata tests/packaged_modules/test_folder_based_builder.py::test_data_files_with_one_label_no_metadata --basetemp=.acceptance_cache/pytest-readonly-supplement -o cache_dir=.acceptance_cache/pytest-cache -o tmp_path_retention_policy=failed
```

Clean-main supplement: 22 passed, 13.191 s, exit 0; this branch: 22 passed, 13.285 s, exit 0. Direct access succeeded; no proxy retry was needed. These targeted results explain 16 offline-only complete-run failures plus six local controls; they do not erase the original 20-failure complete-run result.

The complete unit command is not green. Its 20 shared failures comprise the existing PDF Column assertion, two Parquet extension-dtype errors, and 17 failures from the deliberately offline local/Hub paths. Parquet fixes already have open PRs #8376/#8464 and were not duplicated. Baseline/workflow repair follow-up is assigned separately. The Hub test that creates/uploads/deletes a repository was blocked in the complete offline run and was not executed against the real service. Python 3.10/3.14, minimum-dependency matrices, and authorized online Hub CI have not been run locally.

Pinned Ruff 0.11.8 hook-equivalent actions on the two changed files, current CI Ruff full-directory lint/format, syntax, own-source import, and git diff --check passed. No unrelated source fixes are included.

AI assistance

This change was developed with AI assistance. The diff was reviewed and the real SDK regression tests and local checks described above were executed; limitations are explicitly recorded.
