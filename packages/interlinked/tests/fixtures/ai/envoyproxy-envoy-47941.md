Commit Message: oauth2: fix crash on requests without :path header

Additional Description:
OAuth2Filter::decodeHeaders() dereferenced the `:path` header entry unconditionally (behind an ASSERT that compiles out in release builds). Plain CONNECT requests carry `:authority` but no `:path`, and the connection manager legitimately passes them to the filter chain (see the `isConnect` carve-out in ConnectionManagerImpl), so one unauthenticated CONNECT request was enough to null-deref and take down the process.

The fix fails closed: a request without `:path` gets a 401 via the filter's existing sendUnauthorizedResponse() path, since redirect matching, callback validation, and redirect-URL construction all need the path anyway. Letting it Continue would have silently skipped authentication for CONNECT.

This is the same bug class as the ext_authz path-less crash (CVE-2026-73547) and the REQUESTED_SERVER_NAME null-Host crash (CVE-2026-47220) — the oauth2 filter was just missed. I audited the other `Path()->value()` derefs in http filters (header_mutation, file_server, grpc extractors, jwt_authn matcher, api_key_auth); they are either guarded or unreachable.

Risk Level: Low

Testing: Added regression unit test OAuth2Test.ConnectRequestWithoutPathReturnsUnauthorized (CONNECT request with :authority, no :path -> 401, StopIteration, oauth_failure_ incremented). Note: I could not run the test suite here (no bazel build on this machine); the test mirrors the neighboring SecretsNotReadyReturnsServiceUnavailable test.

Docs Changes: N/A

Release Notes: Added changelogs/current/bug_fixes/oauth2__fix-crash-on-requests-without-path.rst

AI assistance: yes, in part — used for code search and triage; the analysis, fix, and test were reviewed and understood by the submitter.
