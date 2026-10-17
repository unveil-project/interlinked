When I point Atuin AI at a self-hosted atuin-ai-server with `[web_tools]` enabled, any answer that used web search shows up twice.

Since #3893, the client answers any tool call it can't parse with an "Unknown tool call" error result and counts it toward the turn. `web_search` and `web_scrape` are run by the server, so they hit that path too. Once the server has already sent its results, the answer and `done`, the client still sees open tool calls. It sends a second `/api/cli/chat` request with an error result next to each real result, and the model answers again.

This change records calls to tools whose descriptor has `is_client: false` without answering or tracking them, as before #3893, since the server streams their results. Unknown client tools keep the #3893 behaviour. It also adds an FSM test (`server_tool_call_does_not_continue_turn`), which fails without the fix.

Tested against atuin-ai-server with Brave/Firecrawl. Before: two chat requests and the answer twice. After: one request, one answer. `cargo test -p atuin-ai` and `cargo clippy --tests -- -D warnings` pass on 1.98.0.

## Checks
- [x] I am happy for maintainers to push small adjustments to this PR, to speed up the review cycle
- [x] I have checked that there are no existing pull requests for the same thing
