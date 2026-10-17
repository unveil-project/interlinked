Build a fixture corpus for streaming edge cases across OpenAI, Anthropic, Gemini and OpenAI-compatible endpoints.

Acceptance notes:
- text deltas split across arbitrary chunks;
- tool-call argument fragments by index/id;
- reasoning deltas where providers expose them;
- finish reasons and malformed/error events;
- fixtures should run offline in CI.
