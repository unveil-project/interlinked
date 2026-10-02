## Motivation

The renderer scans its entire buffered SSE event on every HTTP body chunk. Large events, such as prompt logprobs, therefore incur quadratic delimiter-search work while they arrive in small fragments, inside the async generation stream.

## Modifications

Remember where delimiter scanning can resume, retaining the final three bytes in case a CRLF separator crosses chunks. Reset this position after consuming an event. Parsing and transport behavior stay the same.

Add coverage for every byte split/chunk size across UTF-8, mixed LF/CRLF separators, comments and multiline data; empty pushes, large unfinished events and parser reuse; and actual HTTP transport of 4096 prompt logprobs.

## Accuracy Tests

- The four direct parser tests pass on both baseline and patched code, preserving existing output behavior.
- Full renderer crate:130 library tests and1 CLI integration test pass, including the fragmented HTTP logprob response.
- Strict Clippy (workspace, renderer lib/tests, multimodal features and radix-tree), formatting and pre-commit checks pass.
- Independent agent review and a second actual-source benchmark run pass; complete output assertions hold at every tested size.

No model forward or GPU code changes.

## Speed Tests and Profiling

CPU-only microbenchmark on the same macOS arm64 host, `rustc +1.92 -O`, median of three samples. It compiles the actual production `SseParser` and `event_end` definitions, feeds JSON logprob events in fixed-size fragments, and asserts the complete payload plus `[DONE]` on every run. Payload construction is outside the timed region.

| Event bytes | Fragment bytes | Before | After |
| ---: | ---: | ---: | ---: |
| 229,500 | 4,096 | 3.283 ms | 0.336 ms |
| 458,876 | 4,096 | 12.560 ms | 0.593 ms |
| 917,628 | 4,096 | 50.293 ms | 1.176 ms |
| 1,835,133 | 4,096 | 198.510 ms | 2.029 ms |
| 3,670,141 | 4,096 | 783.023 ms | 3.589 ms |
| 3,670,141 | 16,384 | 192.912 ms | 3.319 ms |

These numbers measure parser CPU cost, not serving throughput or GPU inference speed. The change removes repeated prefix scans for fragmented events; it does not change the existing front-buffer drain costs for many coalesced events.

<details>
<summary>Reproduce the standalone parser benchmark at each revision</summary>

Run this Python script from the repository root with Rust 1.92 available:

```python
from pathlib import Path
import subprocess
import tempfile

source = Path("rust/sglang-renderer/src/engine/http/mod.rs").read_text()
start = source.index("#[derive(Default)]\nstruct SseParser")
end = source.index("\n#[cfg(test)]", start)
parser = source[start:end]
driver = r'''
fn main() {
    for target_size in [262144, 524288, 1048576, 2097152, 4194304] {
        let count = target_size / 16;
        let values = vec!["[-0.1,42,\"x\"]"; count].join(",");
        let payload = format!("{{\"output_ids\":[42],\"meta_info\":{{\"prompt_tokens\":{count},\"completion_tokens\":1,\"input_token_logprobs\":[{values}]}}}}");
        let frame = format!("data: {payload}\n\ndata: [DONE]\n\n");
        for chunk_size in [4096, 16384] {
            let mut samples = Vec::new();
            for _ in 0..3 {
                let mut parser = SseParser::default();
                let started = std::time::Instant::now();
                let mut outputs = Vec::new();
                for chunk in frame.as_bytes().chunks(chunk_size) {
                    outputs.extend(parser.push(std::hint::black_box(chunk)));
                }
                let elapsed = started.elapsed().as_micros();
                assert_eq!(outputs, [payload.as_str(), "[DONE]"]);
                samples.push(elapsed);
            }
            samples.sort_unstable();
            println!("bytes={} fragment={} median_us={}", frame.len(), chunk_size, samples[1]);
        }
    }
}
'''
with tempfile.TemporaryDirectory() as directory:
    path = Path(directory)
    (path / "bench.rs").write_text(parser + "\n" + driver)
    subprocess.run(["rustc", "+1.92", "--edition=2024", "-O", str(path / "bench.rs"), "-o", str(path / "bench")], check=True)
    subprocess.run([str(path / "bench")], check=True)
```

</details>

## Checklist

- [x] Format code and add unit/transport tests.
- [x] Provide focused CPU performance measurements and behavior checks.
- [x] Follow the existing Rust style; no user-facing documentation change is needed.

Developed with AI assistance; CPU validation and independent agent review are described above.

<!-- pr-states:start -->
---
### CI States

Latest PR Test (Base): <!-- slot:pr-test:start -->:x: [Run #36850941779](https://github.com/sgl-project/sglang/actions/runs/36850941779)<!-- slot:pr-test:end -->
Latest PR Test (Extra): <!-- slot:pr-test-extra:start -->:x: [Run #36850941483](https://github.com/sgl-project/sglang/actions/runs/36850941483)<!-- slot:pr-test-extra:end -->
Latest PR Test (AMD ROCm 10): <!-- slot:pr-test-amd:start -->:heavy_minus_sign: **No AMD PR run found for this commit**.<!-- slot:pr-test-amd:end -->
<!-- pr-states:end -->
