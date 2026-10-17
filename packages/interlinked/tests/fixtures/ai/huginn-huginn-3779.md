Fixes #2223.

Browser CORS preflight sends OPTIONS before a cross-origin POST. The webhook route only matched GET/POST/PUT/DELETE, so that preflight 404ed even when `response_headers` set `Access-Control-Allow-Origin`.

This answers OPTIONS with CORS headers and does not authenticate or create events.
