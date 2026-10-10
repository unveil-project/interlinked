Stack (bottom to top): #73970, #73971, #73972, #73973, #73974, #73975, #73976, #73977, #74030, #74031, #74032, #74033, #74067, #74135, #74136, #74137, #74138, #74139, #74140, **#74141**

## Why

The earlier PRs of the stack have the Dag processor bind each stub task to an artifact, the scheduler send it with the task, and the worker run exactly that file. The Kubernetes test harness still copied the Java JAR from S3 into an `emptyDir` in every Java task pod and in the Dag processor pod, where nothing refreshed it, which [ADR-0013](https://github.com/apache/airflow/blob/main/airflow-core/adr/lang-sdk/0013-persisted-task-handler-bindings.md) calls a second addressing layer. It also ran only Dags that succeed. This PR reads the Java task handler bundle from S3 as a Dag bundle, and adds the failure cases the Kubernetes job can check: a Dag that does not import, and a task that no artifact is bound to.

## What changes

The Java task handler bundle is the `java-artifacts` bucket itself, and the Java task pods run on the image `--java-image` names:

```yaml
# kubernetes-tests/lang_sdk/config/values.yaml
dagProcessor:
  dagBundleConfigList:
    - name: java-task-handlers  # was a LocalDagBundle over an emptyDir that an init container filled
      classpath: "airflow.providers.amazon.aws.bundles.s3.S3DagBundle"
      kwargs: {bucket_name: "java-artifacts", aws_conn_id: "aws_localstack"}
config:
  sdk:
    # "java-sdk" extra, was "worker_container_repository": "lang-sdk-java-worker" and "worker_container_tag": "latest"
    coordinators: '{..., "java-sdk": {..., "extra": {..., "worker_container_repository": "{{ .Values.images.airflow.repository }}", "worker_container_tag": "{{ .Values.images.airflow.tag }}"}}}'
```

- **Java from S3.** The Dag processor refreshes `java-task-handlers` like any Dag bundle, and the Java task pod downloads it when the task starts, with `AIRFLOW_CONN_AWS_LOCALSTACK` on its `base` container. The Java init container, its volumes and the Dag processor's `stage-java-jar` init container are gone.
- **Go stays staged.** An S3 download drops the executable bit that the Go coordinator requires, so the Go bundle is still staged into an `emptyDir` by an init container. `stage_artifacts.py` is Go only and always restores the bit, so `STAGE_CHMOD_EXEC` is gone.
- **`--java-image`.** The Java coordinator's `extra` takes its image from `images.airflow`, which breeze sets to `--java-image`, so the Java task pods use it too. It used to name `lang-sdk-java-worker:latest`, so a custom image reached the Airflow components but not the container that runs the task. The default is unchanged, and the Go and Python task pods keep the plain prod image.
- **Import check.** Each test waits until the Dag processor has imported its Dag and fails with the import errors of the stub Dag bundle, instead of ending in a `RetryError` or a timeout while the trigger returns 404. The wait takes up to 600 s, and each test's execution timeout adds it to the time the run needs, so pytest does not time the test out before the wait reports.
- **A task without an artifact.** `lang_sdk_misrouted.py` is a plain Python task on the routed `golang` queue. No artifact is bound to it, the scheduler queues it, and the worker fails it. The new test waits for `failed` and checks that the task's state reason is the worker's reason (`Task 'python_task_on_golang_queue' of Dag 'lang_sdk_misrouted' has no task handler artifact, and its Dag file 'lang_sdk_misrouted.py' is not an artifact that ExecutableCoordinator runs. ...`). Breeze uploads every Dag file of the harness for it, and the Go pod gets the S3 connection, because a task without an artifact reads its own Dag file from the stub Dags' S3 bundle.
- **CI and docs.** The `tests-kubernetes-lang-sdk` job, the `setup-lang-sdk-test` help and the README run the tests with `-k TestLangSdkCoordinatorExecutor`. The README describes the Java S3 bundle, the staged Go bundle and the new Dag. The breeze command images are regenerated.
- **Go build.** The container build of the Go bundle no longer sets `USER`. The Go SDK stopped calling `user.Current()` when the Go Edge Worker was removed (#71874), and the bundle, `go` and the packer do not link `os/user`. `HOME` stays, for the Go build cache.

## How to test

```bash
uv run --project dev/breeze --locked pytest dev/breeze/tests/test_kubernetes_lang_sdk_commands.py -q
uv run --project kubernetes-tests pytest kubernetes-tests/tests/kubernetes_tests/test_lang_sdk_coordinator_executor.py --collect-only -q
prek run update-breeze-cmd-output mypy-dev mypy-kubernetes-tests --all-files
helm template airflow chart --namespace airflow --set defaultAirflowRepository=ghcr.io/apache/airflow/main/prod/python3.10-kubernetes --set defaultAirflowTag=latest --set executor=KubernetesExecutor --set config.api_auth.jwt_secret=foo --set images.airflow.repository=example/jre --set images.airflow.tag=t1 --set config.kubernetes_executor.worker_container_repository=ghcr.io/apache/airflow/main/prod/python3.10-kubernetes --set config.kubernetes_executor.worker_container_tag=latest -f kubernetes-tests/lang_sdk/config/values.yaml
breeze k8s setup-lang-sdk-test
RUN_LANG_SDK_K8S_TESTS=true breeze k8s tests --executor KubernetesExecutor -- -k TestLangSdkCoordinatorExecutor
```

Ran:

- breeze `test_kubernetes_lang_sdk_commands.py`: 28 passed (25 before, 3 new). The kubernetes-tests module collects 2 tests. `prek run --from-ref <parent> --to-ref HEAD --stage pre-commit` passed, and `mypy-dev`, `mypy-kubernetes-tests`, `mypy-airflow-core` and `mypy-task-sdk` passed with `--all-files`. The breeze command images (`output_k8s` and `output_k8s_setup-lang-sdk-test`) are regenerated, and a second `update-breeze-cmd-output` run changes nothing. The schema snapshot and the Go SDK generated files are unchanged.
- `helm template` with the lang-SDK values and `images.airflow` set to `example/jre:t1`: the Dag processor has the init containers `wait-for-airflow-migrations` and `stage-go-bundle` (no `stage-java-jar`, and no `STAGE_CHMOD_EXEC` anywhere), `java-task-handlers` is an `S3DagBundle` over `java-artifacts`, the `java-sdk` extra is `example/jre` and `t1`, and `[kubernetes_executor]` keeps the plain prod image. With `lang-sdk-java-worker:latest` (the harness default) the render is the base commit's apart from those changes.
- The task pods built with `PodGenerator.construct_pod` the way the executor builds them, from that render: the default and Go pods run the plain prod image (the Go pod has the `stage-go-bundle` init container and the S3 connection on `base`), and the Java pod runs `example/jre:t1`, has no init container and has `AIRFLOW_CONN_AWS_LOCALSTACK` on `base`.
- Checked without a cluster, in scratch tests that are not part of this PR: a plain Python task on a routed queue run through `supervise_task` and the in-process Execution API (the `executors/test_lang_sdk_unbound_task.py` setup with `@task` in place of `@task.stub`) is `failed` with the worker's reason as its `retry_reason` (2 passed, and `up_for_retry` with a retry left). The reason in the new test is the start of the message that `ExecutableCoordinator` builds for this task. `stage_artifacts.py` makes every staged file executable (fake bundle), and the import check returns on an imported Dag and fails with the import errors otherwise (fake session, 3 passed).
- The import wait replayed on a clock 100 times faster under each test's own `execution_timeout`, with the flags breeze passes (`--timeouts-order=moi`) and a Dag that never imports (scratch test): both tests fail with the import errors, while an execution timeout equal to the wait ends the replay in a bare `Timeout >600.0s`.
- A local kind run on Kubernetes v1.35.0 (aarch64 host), with `breeze k8s deploy-airflow --executor KubernetesExecutor --multi-namespace-mode`, then `setup-lang-sdk-test` with `LANG_SDK_NATIVE_TOOLCHAIN=true` and JDK 17, then the test command above: 2 passed. The Dag processor read `lang-sdk-dags` and `java-task-handlers` from localstack and bound the 4 stub tasks, `lang_sdk_combined` succeeded with all 6 tasks on the first try, and `python_task_on_golang_queue` failed with the worker's reason as its state reason. The task pods' images were not asserted. The CI job `tests-kubernetes-lang-sdk`, which this PR triggers because it changes `kubernetes-tests/`, also covers the amd64 runner and the import wait on CI hardware.
- `airflow dag-processor` run locally with the `[sdk]` and Dag bundle configuration rendered from these values, local copies standing in for the S3 buckets: both Dag files import and the same 4 stub tasks are bound. With the Go binary left at mode 644, as an S3 download leaves it, `lang_sdk_combined.py` fails to import because the binary is not executable, which is why Go stays staged.

The breeze tests of each change fail without it, checked by reverting its code: the two upload tests fail against the single-Dag upload, and the Go container test fails against the old `USER` setting. The rendered values show what the YAML changes do: without the `images.airflow` template the `java-sdk` extra stays `lang-sdk-java-worker` under a custom image, and without the S3 bundle change the render still has `stage-java-jar` and a `LocalDagBundle` for `java-task-handlers`. The import check and the failure test fail on a cluster only: the first when the Dag processor cannot import the file, the second when the worker does not record its reason, or when the Go pod has no S3 connection (the reason is then a bundle initialization error).

---

##### Was generative AI tooling used to co-author this PR?

- [X] Yes (please specify the tool below)

Generated-by: Claude Code (Opus 5.5) following [the guidelines](https://github.com/apache/airflow/blob/main/contributing-docs/05_pull_requests.rst#gen-ai-assisted-contributions)
