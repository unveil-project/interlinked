Make `json-from-llm` useful from shell pipelines as well as library code.

Acceptance notes:
- `json-from-llm` reads stdin and prints normalized JSON to stdout;
- supports `--expect object|array|any` and `--no-repair`;
- exits non-zero with a concise stderr message when no JSON is found;
- README documents copy-paste usage;
- package remains zero runtime dependencies.
