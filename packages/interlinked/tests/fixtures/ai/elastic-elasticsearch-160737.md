`OpenAiStreamingProcessor` rejects `"content": null`, which can appear in llama.cpp's initial role chunk or alongside `reasoning_content`. Skip null content so later text chunks can still be processed.

With the fix, all 10 `OpenAiStreamingProcessorTests` pass in a standalone JUnit run; both new tests fail without it. Gradle testing is blocked by HTTP 403 errors fetching native dependencies.
