## Overview

A `/v1/systemone` request can crash `llama-server` on Linux when it serves a d1-omni model (reproduced) or a kev model (same code, not run). Both escape `<|name|>` in the request text with `std::regex_replace` and `<\|([A-Za-z0-9_]+)\|>`. libstdc++ matches the name with a recursive call per character, so a `state` of `"<|"` followed by 30,000 letters overflows the 8 MB stack of the HTTP thread. The escape runs while the prompt is built, before any size check. macOS (libc++) is not affected.

This PR replaces the regex with `server_decision_escape_special_tokens()`, a loop that writes the same text (U+00A6 in place of `|` around a `[A-Za-z0-9_]+` name), used by d1-omni (strings and object keys) and kev.

## Additional information

Reproduction (Linux):

```sh
llama-server -hf LiquidAI/d1-omni-600M-GGUF:F16 --port 8080 &
python3 -c "import json; print(json.dumps({'state': '<|' + 'a'*30000, 'questions': {'q': {'type': 'noul', 'instructions': 'Is the text long?'}}}))" > esc.json
curl -s localhost:8080/v1/systemone -H 'Content-Type: application/json' --data-binary @esc.json
```

Without a model, the regex alone (`g++ -std=c++17 -O2 regex.cpp -o regex && ./regex 20000 && ./regex 30000`):

```cpp
#include <cstdio>
#include <cstdlib>
#include <regex>
#include <string>
int main(int argc, char ** argv) {
    const std::string s = "<|" + std::string(std::strtoul(argv[1], nullptr, 10), 'a');
    static const std::regex re("<\\|([A-Za-z0-9_]+)\\|>");
    std::printf("%zu\n", std::regex_replace(s, re, "<\xC2\xA6$1\xC2\xA6>").size());
}
```

It crashes between 20,000 and 30,000 characters with the default 8 MB stack; gdb shows 3 frames per character (`_M_dfs` twice, `_M_rep_once_more` once).

Linux x86, master 50e3e3e48 and this PR, d1-omni-600M F16 on the CPU:

| `state` | master | this PR |
|---|---|---|
| `"<\|"` + 20,000 letters | HTTP 500 (input too large) | same |
| `"<\|"` + 30,000, 100,000 or 1,000,000 letters | server dies (SIGSEGV) | HTTP 500 (input too large), server up |
| plain text; `<\|...\|>` in the state, keys and options; non-ASCII text | answers | identical answers |

- Same output as the regex: no difference on about 4.5M generated strings (macOS) and on the test's 19,531 strings (Linux). Each input byte is read at most twice.
- Regression test, new `test-server-decision`: fixed cases, every string of up to 6 characters over `<|>a-` against the old regex call, and 1,000,000-character names. With the regex put back, it crashes on Linux.
- A new test file because no C++ test covers `server-decision.cpp`, and the Python tests have no d1-omni or kev model.
- Not fixed here: a deeply nested JSON `state` still crashes the server in jinja `tojson` (about 30,000 levels on Linux); separate PR "common : limit the nesting of parsed JSON to 128 levels".

## Requirements

- I have read and agree with the [contributing guidelines](https://github.com/ggml-org/llama.cpp/blob/master/CONTRIBUTING.md)
- AI usage disclosure: YES, automation of the testing permutations and finding the working combination under a human supervision