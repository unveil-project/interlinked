## TLDR

Problem this solves:

- Upstream headers disappear when responses are rebuilt or streamed
- Spend logs store response bodies without upstream debugging headers

How it solves it:

- Capture headers before reading bodies, using explicit request-owned state
- Persist bounded, redacted snapshots in existing spend-log metadata
- Display upstream responses independently of response-body logging

Intentional product change: log details gain an Upstream Response Headers section for new requests, including when body logging is disabled; existing response-body access remains available

## User Flow

Before: upstream trace IDs are missing from the stored request

1. Send POST http://localhost:4000/v1/chat/completions requesting a streamed `lookup` tool call
2. Receive the tool call and its completion ID
3. GET http://localhost:4000/spend/logs?request_id=COMPLETION_ID and see the body without upstream headers

After: the same stored request includes the upstream trace ID

1. Send POST http://localhost:4000/v1/chat/completions requesting a streamed `lookup` tool call
2. Receive the tool call and its completion ID
3. GET http://localhost:4000/spend/logs?request_id=COMPLETION_ID and see headers under `metadata.upstream_responses`

## Implementation

The logging object owns the capture buffer. Shared HTTP POST transports and OpenAI/Azure chat SDK transports record each upstream exchange before body parsing or status handling. Standard logging payloads carry an independent snapshot, and spend logs persist it in their existing metadata JSON

Search GET/POST callers now pass capture ownership explicitly. Shared GET reuses the capture send helpers, including its bounded-response redirect loop

There is no production ContextVar, shared-client hook mutation, schema migration, or change to downstream header forwarding. SDK adapters delegate request construction and sending to the original HTTP client. They retain its signing overrides, cookie policy, auth, redirect handling, and hooks, without creating a second HTTP processing pipeline. Closing an adapter leaves the borrowed pool open. Legacy provider-prefixed headers remain a fallback for providers outside these transports

Each snapshot keeps the latest eight exchanges, up to 64 headers each, preserving duplicate names. Header names and values are bounded to 128 and 512 characters; known credential headers are redacted. Cache hits have no upstream exchanges, and user metadata cannot override the server-stamped field

## Transport inventory

This inventory groups execution boundaries rather than assuming an endpoint has one implementation. Coverage remains partial

| Boundary | Status | Evidence or remaining gap |
| --- | --- | --- |
| OpenAI/Azure chat SDK clients | Implemented; adapter contract verified | Capture-on/off regressions cover normal execution and borrowed pool ownership; new strict xfails expose redirect-target connection failures and body-reading response hooks |
| Shared HTTP POST with a logging object | Implemented; three routes verified | Chat, Responses, and Messages pass gateway persistence checks with streaming and body logging on/off |
| Shared POST callers omitting the logging object | Legacy-only | Several Images, Audio, Embeddings, and provider-specific calls still omit capture ownership |
| Shared GET with a logging object | Implemented; search callers verified | Sync/async search captures success, HTTP errors, and interrupted bodies; bounded async GET retains headers across redirect-target failures |
| Shared PUT, PATCH, DELETE | Legacy-only | These methods do not yet receive canonical capture state |
| Non-chat SDK calls | Reproduced missing capture | Sync/async OpenAI Images and OpenAI/Azure Embeddings execute successfully but leave canonical capture empty; Audio remains unverified |
| Direct aiohttp, raw HTTPX/requests, native SDKs | Unverified | These bypass the instrumented boundary, including aiohttp chat and SageMaker SDK paths |
| Gateway disconnects and fallback history | Partially verified | Full fallback header history passes; attribution fails. Disconnect tests expose missing terminal rows and missing Messages disconnect status |

## Remaining work

The duplicate-client regression is fixed. The following work remains before this PR can claim consistent capture across supported upstream transports

- [ ] Complete shared HTTP and SDK coverage
  - Wire OpenAI Images and OpenAI/Azure Embeddings into canonical capture; inventory Audio and Azure Images separately, because Azure Images uses shared HTTP instead of the supplied SDK client
  - Capture received headers before a response hook reads a failing body or a followed redirect reaches an unavailable target
  - Pass explicit capture ownership through remaining POST/GET callers and add capture to PUT, PATCH, and DELETE
  - Add boundary adapters for direct aiohttp, raw HTTPX/requests, and native SDK paths, recording headers before parsing or status handling
  - Apply the same sync/async capture-on/off compatibility contract to each boundary, preserving outgoing requests, auth, cookies, redirects, retries, exceptions, streaming, and pool ownership
- [x] Wire sync/async search GET and POST calls into canonical capture, including received headers on HTTP and body-read failures
- [ ] Finish canonical ownership and compatibility views
  - Define logical-call ownership and retry/fallback attribution explicitly; current SDK retries and router fallbacks can share an attempt ID
  - Full failed/serving header retention now has passing gateway contracts; distinguish their attempt IDs and extend isolation coverage
  - Make callbacks and spend persistence consume the same canonical snapshot, then derive legacy fields with explicit filtering and precedence rules
- [ ] Prove gateway lifecycle behavior
  - [x] Execute real socket disconnects before the first chunk and midway through streaming across Chat, Responses, and Messages, with body logging off/on
  - Upstream cleanup passes all 12 disconnect variants; terminal-row assertions expose missing rows before the first chunk on all three routes and mid-stream on Responses
  - Preserve disconnect status on Messages mid-stream rows, which already retain headers and obey body logging policy
  - Cover delayed first chunks, HTTP/body failures, retries, fallbacks, concurrent calls, cache hits, and body logging enabled/disabled
  - Manage application lifespan explicitly in in-process tests and persist detached snapshots in background work
- [ ] Close validation and review gaps
  - Verify successful real-provider Responses and Messages calls; current live evidence covers provider 403 failures only
  - Mark every transport inventory entry implemented and verified, then rerun focused tests and refresh gateway HTTP evidence at the final commit
  - Require passing CI and coverage, Greptile confidence of at least 4/5, and acceptable Veria and Bugbot results before maintainer review

Shared HTTP/SDK integration is moderate work. Fallback ownership and disconnect persistence carry more regression risk because they cross request, stream, and background logging lifetimes. Allow several focused engineering days for the full sequence, subject to findings in the remaining native SDK paths

Completion means every supported upstream transport records received headers into one canonical capture, logging consumes it across endpoints and lifecycle outcomes, and capture does not change upstream execution. SDK cancellation tests alone do not establish gateway spend-log persistence after disconnect. Keep this PR draft until these gaps are resolved

## Validation

At `04b69a3d0edf903a1ceb482c600c1e5a4fe1f617`, the real proxy/Postgres header suite completes with six passes and 12 strict xfails. The disconnect matrix covers three routes, before-first-chunk versus mid-stream interruption, and body logging off/on. All 12 disconnect variants close the upstream socket. Eight produce no terminal spend row before or after graceful shutdown; two Messages mid-stream variants retain headers and body policy but omit disconnect status. Chat mid-stream passes both body policies. The two other xfails are ambiguous fallback attempt IDs; full fallback header retention passes

The new disconnect defects were first reproduced without xfail handling. The peer was separately checked with closed and deliberately held-open clients at both interruption points: server timeout never counted as client cleanup. Three existing wire regressions pass, covering generated UTF-8 partitions, truncated streams, and SDK cancellation

The runner now accepts an exact pytest node ID and `--runxfail`, recording pytest arguments and the replay seed in `execution.json`. A real one-node Messages replay returns a normal failure with `MissingDisconnectStatus`; the qualification run classifies it separately as a known gap. Known-failure marks catch only dedicated missing-row, missing-status, missing-header, or attribution exceptions. Setup, payload, cleanup, duplicate-row, and unrelated assertion errors remain failures; repaired behavior triggers strict XPASS

The report distinguishes passes, skips, expected failures, unexpected passes, regressions, and unexecuted nodes. A qualified run with gaps records `complete: true` and `all_passed: false`. Independent probes verify skip, unrelated-failure, strict/non-strict XPASS, and fail-fast classification

The previous fast suite at `764b991331daf909973ec7c2cb5b6f5cd0677dfe` had 200 passes and 10 strict xfails for failed redirects, body-reading hooks, and missing capture in OpenAI/Azure Embeddings and OpenAI Images. Hypothesis exhausts the six meaningful search outcome orderings per GET/POST and sync/async case. No production code changed in either validation follow-up

Replay commands and the agent repair loop are in `tests/integration/README.md`. Audio, Azure Images, remaining unowned callers, shared PUT/PATCH/DELETE, direct/native transports, SDK retry attribution, and additional gateway failure/cache/concurrency scenarios still need executable contracts; this suite does not certify them

Scoped Ruff and test-quality gates pass without budget changes. The prior branch-wide Python gates passed, but full-branch dashboard lint and API-type synchronization remain unavailable because this checkout lacks `ui/litellm-dashboard/node_modules`. Hosted CI, coverage, and bot reviews remain unverified for this tip. Live-provider HTTP proof below remains historical evidence from `d58b9838`

## Pre-Submission checklist

- [x] I have added meaningful tests
- [x] Focused regression runs complete with explicitly reported known-gap xfails
- [ ] My PR passes all required CI/CD checks
- [x] My PR only solves upstream-response-header observability
- [ ] Greptile confidence is at least 4/5 before maintainer review

This PR stays draft pending the remaining transport/lifecycle work and CI, coverage, Greptile, Veria, and Bugbot results

## Screenshots / Proof of Fix

Gateway HTTP checks use the normal proxy CLI, a local PostgreSQL database, and real Cohere calls. No provider or license mocks are used in these runs. Chat completions succeed with actual tool calls and token usage. The provider rejects Responses and Messages with HTTP 403, so those live cases verify failure-header persistence only

<details>
<summary>Shared setup and curl commands</summary>

Set `COHERE_API_KEY` and `DATABASE_URL` in the environment, then start each revision with this config. The baseline ran on port 4001; the current tip ran on port 4000, as shown below

```yaml
model_list:
  - model_name: header-proof
    litellm_params:
      model: openai/command-a-plus-05-2026
      api_base: https://api.cohere.ai/compatibility/v1
      api_key: os.environ/COHERE_API_KEY
      max_retries: 0
general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL
  store_model_in_db: true
  proxy_batch_write_at: 1
  proxy_batch_polling_interval: 1
router_settings:
  num_retries: 0
```

```bash
export LITELLM_MASTER_KEY=sk-header-test
export STORE_PROMPTS_IN_SPEND_LOGS=true
export STORE_MODEL_IN_DB=true
python -m litellm.proxy.proxy_cli --config /tmp/header-proof.yaml \
  --host 127.0.0.1 --port 4000 --use_prisma_db_push
```

Save the chat payload as `/tmp/header-proof-payload.json`

```json
{"model":"header-proof","messages":[{"role":"user","content":"Use lookup to search for probe"}],"tools":[{"type":"function","function":{"name":"lookup","description":"Look up a query","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}}],"max_tokens":128,"reasoning_effort":"none"}
```

For `/v1/responses`, use `input` instead of `messages`, `max_output_tokens: 1024`, omit reasoning, and flatten the function tool into `{ "type": "function", "name": "lookup", "description": "Look up a query", "parameters": ... }`

For `/v1/messages`, use `max_tokens: 1024`, omit reasoning, and express the same tool as `{ "name": "lookup", "description": "Look up a query", "input_schema": ... }`

The following commands show the common request and spend-log readback. The chat runs obtain `request_id` from the JSON body or first SSE chunk; failed calls use `x-litellm-call-id` from the saved response headers

```bash
route=chat/completions
for stream in false true; do
  jq --argjson stream "$stream" '. + {stream: $stream}' \
    /tmp/header-proof-payload.json > /tmp/header-proof-request.json
  curl -sS -D /tmp/header-proof-headers.txt \
    "http://localhost:4000/v1/$route" \
    -H 'Authorization: Bearer sk-header-test' \
    -H 'Content-Type: application/json' \
    --data-binary @/tmp/header-proof-request.json > /tmp/header-proof-response.txt
  if [ "$stream" = true ]; then
    request_id=$(sed -n 's/^data: //p' /tmp/header-proof-response.txt \
      | sed '/^\[DONE\]$/d' | jq -r '.id' | head -1)
  else
    request_id=$(jq -r '.id' /tmp/header-proof-response.txt)
  fi
  for attempt in $(seq 1 100); do
    curl -fsS --get http://localhost:4000/spend/logs \
      -H 'Authorization: Bearer sk-header-test' \
      --data-urlencode "request_id=$request_id" > /tmp/header-proof-log.json
    jq -e 'length > 0' /tmp/header-proof-log.json > /dev/null && break
    sleep 0.2
  done
  jq -c --arg stream "$stream" '[.[] |
    .metadata=(.metadata | if type=="string" then fromjson else . end) |
    {stream:$stream,request_id,body_stored:(.response != "{}"),
     upstream_responses:[.metadata.upstream_responses[]? |
       {status_code,headers:[.headers[] | select(.[0]=="x-debug-trace-id")]}]}]' \
    /tmp/header-proof-log.json
done
```

For the two rejected routes, send their payloads with the same curl command and readback, using this request ID extraction

```bash
request_id=$(awk 'tolower($1)=="x-litellm-call-id:" {gsub("\r","",$2); print $2}' \
  /tmp/header-proof-headers.txt)
```

</details>

### Before (91ff0454aff05da968d19fcf83785f1b728cbfc6)

#### /v1/chat/completions

1. POST http://localhost:4001/v1/chat/completions using the shared curl commands with `stream: false` and `stream: true`, then GET http://localhost:4001/spend/logs?request_id=REQUEST_ID
2. Both requests return HTTP 200, `lookup({"query":"probe"})`, and `finish_reason: tool_calls`. Stored results:

   ```json
   {"stream":"false","request_id":"9394c764-6e48-42a2-8ee6-86df5445a77e","body_stored":true,"upstream_responses":[]}
   {"stream":"true","request_id":"55602357-41d6-4edf-b1af-7ed47718aa2a","body_stored":true,"upstream_responses":[]}
   ```

#### /v1/responses

1. POST http://localhost:4001/v1/responses using the shared curl commands with `stream: false` and `stream: true`, then GET http://localhost:4001/spend/logs?request_id=REQUEST_ID
2. Both requests return HTTP 403 with the provider message `forbidden`. Stored results:

   ```json
   {"route":"responses","stream":"false","http_status":"403","status":"failure","upstream_responses":[]}
   {"route":"responses","stream":"true","http_status":"403","status":"failure","upstream_responses":[]}
   ```

#### /v1/messages

1. POST http://localhost:4001/v1/messages using the shared curl commands with `stream: false` and `stream: true`, then GET http://localhost:4001/spend/logs?request_id=REQUEST_ID
2. Both requests return HTTP 403 with the provider message `forbidden`. Stored results:

   ```json
   {"route":"messages","stream":"false","http_status":"403","status":"failure","upstream_responses":[]}
   {"route":"messages","stream":"true","http_status":"403","status":"failure","upstream_responses":[]}
   ```

### After (d58b9838a034c73108f12541451218e9c3a872bf)

#### /v1/chat/completions

1. POST http://localhost:4000/v1/chat/completions using the shared curl commands with `stream: false` and `stream: true`, then GET http://localhost:4000/spend/logs?request_id=REQUEST_ID
2. Both requests return HTTP 200, `lookup({"query":"probe"})`, and `finish_reason: tool_calls`. Stored results:

   ```json
   {"stream":"false","request_id":"cf1bd4a7-fbc6-458e-ac78-f73ba4d0df3f","body_stored":true,"upstream_responses":[{"status_code":200,"headers":[["x-debug-trace-id","c7296c4bd15b98f226ff388421f6a325"]]}]}
   {"stream":"true","request_id":"d845e44b-e900-4a86-8f4e-273ab0448b37","body_stored":true,"upstream_responses":[{"status_code":200,"headers":[["x-debug-trace-id","04611dd1ebfe922c31dd85daac6a63eb"]]}]}
   ```

#### /v1/responses

1. POST http://localhost:4000/v1/responses using the shared curl commands with `stream: false` and `stream: true`, then GET http://localhost:4000/spend/logs?request_id=REQUEST_ID
2. Both requests return HTTP 403 with the provider message `forbidden`. Stored results:

   ```json
   {"route":"responses","stream":"false","http_status":"403","status":"failure","upstream_responses":[{"status_code":403,"headers":[["x-debug-trace-id","4709e8cbb2944d2353d398d55e13e56b"]]}]}
   {"route":"responses","stream":"true","http_status":"403","status":"failure","upstream_responses":[{"status_code":403,"headers":[["x-debug-trace-id","cf7a96366b440075e76ef75ab35ff677"]]}]}
   ```

#### /v1/messages

1. POST http://localhost:4000/v1/messages using the shared curl commands with `stream: false` and `stream: true`, then GET http://localhost:4000/spend/logs?request_id=REQUEST_ID
2. Both requests return HTTP 403 with the provider message `forbidden`. Stored results:

   ```json
   {"route":"messages","stream":"false","http_status":"403","status":"failure","upstream_responses":[{"status_code":403,"headers":[["x-debug-trace-id","34ac5b5552173cc0ca1a3b854e41a0d4"]]}]}
   {"route":"messages","stream":"true","http_status":"403","status":"failure","upstream_responses":[{"status_code":403,"headers":[["x-debug-trace-id","7d28059a356772a40842ec186a19caa7"]]}]}
   ```

## Type

Bug Fix, Refactoring

## Caveats

### Medium

- Non-chat SDKs and direct transports still lack canonical capture
- Live Responses/Messages success remains unverified; this provider returns 403
- Full fallback header history is verified, but attempt attribution fails
- Disconnects before the first chunk leave no terminal spend row on all three routes; Responses also loses mid-stream records, while Messages mid-stream records omit disconnect status

### Low

- Existing spend rows are not backfilled
- Capture retains eight exchanges with bounded header values
- Known credential headers are redacted; arbitrary proprietary secrets need classification
- CI, coverage, and automated reviewer results are pending

## Final Attestation

- [ ] All relevant edge cases and regressions are verified


