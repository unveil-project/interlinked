## Motivation

With `--incremental-streaming-output`, the tokenizer manager sends only the new text in each chunk. The Ollama `/api/chat` and `/api/generate` routes still treat each chunk as the full reply. They skip as many characters as the previous chunk contained, so parts of the response disappear.

Both routes also drop new text from the last chunk. For a reply that ends in one chunk, the client gets no text at all. #17961 reported this last-chunk case earlier and was closed as stale.

Fixes #42141.

## Modifications

Use the tokenizer manager's output mode in both routes. Pass incremental text through as it is. For cumulative text, keep the existing suffix calculation.

If the last chunk has new text, send that text before the usual empty `done: true` event. An empty last chunk still produces just the completion event.

## Accuracy Tests

Added CPU tests for both routes and both output modes. They cover an empty last chunk, text in the last chunk, a single chunk, Unicode, empty chunks, and repeated text. The tests use the real handlers and response schemas with a fake tokenizer manager.

```bash
PYTHONPATH=python python test/registered/unit/entrypoints/ollama/test_streaming.py -v
pre-commit run --files python/sglang/srt/entrypoints/ollama/serving.py test/registered/unit/entrypoints/ollama/test_streaming.py
```

All six test methods passed (24 subcases). The same tests failed in 18 subcases before the fix. Pre-commit passed. The test is registered in `base-a-test-cpu`.

## Speed Tests and Profiling

No model or kernel code changes. No GPU benchmark was run.

## Checklist

- [x] Format code with pre-commit.
- [x] Add unit tests and register them for CPU CI.
- [x] Follow the SGLang code style.
- Documentation: no API or option changes.
- Model accuracy and speed benchmarks: not needed for this response-format fix.

<!-- pr-states:start -->
---
### CI States

Latest PR Test (Base): <!-- slot:pr-test:start -->:x: [Run #36947475510](https://github.com/sgl-project/sglang/actions/runs/36947475510)<!-- slot:pr-test:end -->
Latest PR Test (Extra): <!-- slot:pr-test-extra:start -->:x: [Run #36947475312](https://github.com/sgl-project/sglang/actions/runs/36947475312)<!-- slot:pr-test-extra:end -->
Latest PR Test (AMD ROCm 10): <!-- slot:pr-test-amd:start -->:x: [Run #36947475413](https://github.com/sgl-project/sglang/actions/runs/36947475413)<!-- slot:pr-test-amd:end -->
<!-- pr-states:end -->
