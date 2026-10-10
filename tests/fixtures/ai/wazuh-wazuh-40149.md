## Description

Preserve the original Python `ImportError` message when Google Cloud dependencies fail while importing. This prevents nested dependency failures with `ImportError.name == None` from being reported as a missing `None` module.

Closes #40127

## Proposed Changes

- pass the original `ImportError` to `GCloudError` in both bucket and Pub/Sub import paths
- update error 1003 to describe the underlying import failure
- chain the original exception for traceback context
- cover missing-module and nested-import errors in the exception unit test

### Results and Evidence

Before: `GCloudImportError: The None module is required`

After: `GCloudImportError: Error importing the Google Cloud modules: urllib3 v2 only supports OpenSSL 1.1.1+`

### Manual tests with their corresponding evidence

- [x] `python3 -m compileall -q gcloud`
- [x] direct regression assertions produced the expected messages for a missing module and an `ImportError` with no module name
- [x] `git diff --check`
- [x] Log syntax and correct language review
- Compilation checks: N/A, Python-only change
- Memory tests: N/A
- Decoder/Rule tests: N/A
- Engine tests: N/A
- API/Framework integration tests: N/A

The local Python environment does not contain pytest or the full Google Cloud test dependencies, so the focused pytest file was not executed locally.

### Artifacts Affected

- Google Cloud bucket and Pub/Sub wodles
- GCloud import error message

### Configuration Changes

N/A

### Tests Introduced

The existing error 1003 unit test is parameterized to cover both ordinary missing modules and nested import failures where `ImportError.name` is `None`.

## Review Checklist

- [x] Code changes reviewed
- [x] Relevant evidence provided
- [x] Tests cover the new functionality
- [x] Configuration changes documented as N/A
- [x] Developer documentation impact reviewed as N/A
- [x] Meets the issue requirements
- [x] No unresolved dependencies with other issues