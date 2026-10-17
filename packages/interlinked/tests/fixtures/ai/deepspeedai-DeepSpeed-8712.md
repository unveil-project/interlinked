`SlurmRunner.get_cmd` always prefixes the user program with `python -u`, so:

- `deepspeed --launcher slurm --module pkg.train` runs `srun ... python -u pkg.train`, which fails because `-m` is missing;
- `deepspeed --launcher slurm --no_python ./run.sh` still runs `python -u ./run.sh`.

The OpenMPI, MPICH and MVAPICH backends already build this prefix from `--no_python`/`--module`; this PR makes the SLURM backend do the same.

Test: `test_slurm_runner_module_and_no_python` in `tests/unit/launcher/test_multinode_runner.py` checks the tokens between `--export=...` and the script, for both flags. It fails on master (2 failures) and passes with the change. `pytest tests/unit/launcher/test_multinode_runner.py` gives 19 passed (CPU only, Windows 11, torch CPU wheel), and `pre-commit run --files` on the changed files passes.
