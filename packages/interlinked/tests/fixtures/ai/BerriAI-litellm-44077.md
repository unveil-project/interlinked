## TLDR

Problem this solves:

- An Anthropic `/v1/messages` pass-through stream that ends with `event: error` is logged as a success
- OTEL span ends OK and failure callbacks never fire

How it solves it:

- When the collected frames hold an error event, log a failure instead of dispatching success handlers
- Status comes from the existing Anthropic error type map (e.g. `overloaded_error` -> 503, `api_error` -> 500)
- Partial usage is still recorded through the existing failure path

## User Flow

Before: a developer streams through the proxy and an upstream error mid-stream shows up as a successful request in their traces

1. They send POST https://litellm-domain/anthropic/v1/messages with `"stream": true`
2. The upstream returns 200, streams a few content deltas, then an `event: error` frame and closes cleanly
3. Their OTEL backend shows the `litellm_request` span as OK and no failure callback runs

After: the same request is recorded as a failed request

1. They send the same POST https://litellm-domain/anthropic/v1/messages with `"stream": true`
2. The upstream streams the same deltas, then the `event: error` frame
3. The OTEL span is marked as an error and failure callbacks run, with the tokens streamed so far still counted

## Relevant issues

Fixes #44027

## Pre-Submission checklist

- [x] I have added meaningful tests
- [x] The test files covering my change pass locally: `tests/test_litellm/proxy/pass_through_endpoints/test_streaming_handler_anthropic_error_frame.py` (new) and the existing `test_streaming_handler.py` / `test_streaming_handler_interrupt.py` (40 passed)
- [ ] My PR passes all required CI/CD checks
- [x] My PR's scope is as isolated as possible; it only solves 1 specific problem
- [ ] Greptile confidence score of at least 4/5

## Type

🐛 Bug Fix

## Caveats (if any)

### Medium

- Verified with unit tests that call the logging router directly; no live Anthropic call was made

### Low

- Tests fail without the change (3 of 4 fail on current main)
