## Purpose

`FunctionGemmaToolParser.extract_tool_calls_streaming` dropped a tool call entirely when the whole
`<start_function_call>call:name{...}<end_function_call>` block arrived inside one streaming delta, which happens with
speculative decoding, multi-token prediction or `stream_interval > 1`.

A tool call was only opened in the branch guarded by `start_count > prev_start_count and start_count > end_count`. When a
complete block lands in a single delta, `start_count == end_count` for that step, so the call was never opened and
`current_tool_id` stayed at `-1`. The "call just ended" branch did run, but it was guarded by `current_tool_id >= 0` and
so returned `None`. The client got nothing: no name, no arguments, no error, even though non-streaming
`extract_tool_calls` parses the same text correctly.

This fix moves the completion handling into `_flush_completed_calls`, which opens any completed call that was never
started (advancing `current_tool_id` and the `streamed_args_for_tool` / `prev_tool_call_arr` bookkeeping) before emitting
its name and arguments. It is called both when a call ends and when a delta closes one call while opening the next, so
trailing arguments of an in-flight call are not lost when a new `<start_function_call>` shows up in the same delta.

A delta that carries several calls now reports all of them in one update. That is how other parsers behave when tokens
are batched (see the `assert_one_tool_per_delta=False` tests for granite, olmo3, pythonic, kimi_k2 and others); the
alternative would be to hold back all but the first call, which is exactly the silent loss this PR fixes.

Related to #48020 (the FunctionGemma case reported there).

Not a duplicate: the only other open PR touching this streaming path is #48705, which changes how argument diffs are
computed (`find_common_prefix`, dropping the premature closing brace) and never touches the branches that open a call,
so it does not fix this bug. #57768, #57120 and #57989 are unrelated (regex timeout, trailing content, hyphenated
names). #48636 is the same bug class in the DeepSeek V3/V3.1 parser, a different file. Whichever of #48705 and this PR
lands second needs a trivial rebase, since both touch the argument-diff lines and add a `TestExtractToolCallsStreaming`
class; I am happy to rebase on top of #48705.

## Test Plan

```bash
pytest tests/tool_parsers/test_functiongemma_tool_parser.py -v
```

Streaming tests:

- `test_whole_tool_call_in_single_delta`: the whole call in one delta reconstructs to the same name/arguments as
  `extract_tool_calls`.
- `test_parallel_tool_calls_in_single_delta`: two complete calls in one delta.
- `test_second_tool_call_in_single_delta`: one call streamed token by token, the second complete in its own delta.
- `test_tool_call_closed_and_next_call_in_same_delta`: one delta closes the first call's arguments and carries the whole
  second call.
- `test_tool_call_split_across_deltas` covers the pre-existing token-by-token path and keeps the one-tool-call-per-delta
  invariant.

## Test Result

Before the parser change (tests only, on `main`):

```
4 failed, 16 passed
FAILED ...::TestExtractToolCallsStreaming::test_whole_tool_call_in_single_delta
FAILED ...::TestExtractToolCallsStreaming::test_parallel_tool_calls_in_single_delta
FAILED ...::TestExtractToolCallsStreaming::test_second_tool_call_in_single_delta
FAILED ...::TestExtractToolCallsStreaming::test_tool_call_closed_and_next_call_in_same_delta
```

After:

```
20 passed, 1 warning in 3.47s
```

`pre-commit run --files vllm/tool_parsers/functiongemma_tool_parser.py tests/tool_parsers/test_functiongemma_tool_parser.py`
passes (ruff, mypy, SPDX, test tethering).

No model evaluation: this only changes how already-generated text is turned into streaming deltas, not sampling or
model output, and the added tests pin the streaming result to the non-streaming parse of the same text.

I used AI help on this. I went through every changed line, traced the state machine by hand, and ran the tests locally.
