Part of #14738, fixes #14846.

`rename_symbol` waited for the rename response with `block_on` in the prompt callback. That blocks the main loop, which is also where requests from the language server get answered, so when a server sends a request of its own while handling the rename (typescript-language-server 5.1.0 and 5.1.1 ask for `workspace/configuration`), both sides wait until the request times out. tls 5.1.2 works around it on their side (typescript-language-server/typescript-language-server#1048), but the editor shouldn't block here either. This sends the rename as a job, like prepare rename already does, as suggested in https://github.com/helix-editor/helix/issues/14738#issuecomment-3563735431. Completion resolving still blocks and isn't touched here.

Since the editor keeps running while the request is in flight, the document can change before the response arrives, and tls sends plain `changes` without a version. If the document the rename was started in has changed, the edits are now discarded with an error, similar to how formatting drops stale changes.

Tested with a local integration test against a small fake language server (times out before the change, renames after; a second test covers the discard path) and with a scripted run of `hx` with typescript-language-server 5.1.1 on the snippet from #14738. The test isn't included since the integration tests have no language server setup.

I used Claude Code for the investigation, the code, the tests and this description, and went through the diff myself before opening this.
