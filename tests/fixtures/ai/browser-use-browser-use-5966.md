Claude can use Browser Use as the driver for Anthropic's browser toolset. This adds all 31 browser actions and Bash from the Browser Use integration, with local Chromium, Browser Use Cloud, and existing CDP browser examples.

The driver manages browsers it starts and leaves existing sessions under application control. Cloud requests negotiate the granted API scope and retain that version for cleanup. Browser references track document identity. Uploads and downloads document the boundary between browser-host paths and SDK-host files; cross-host transfer remains the application's responsibility.

The root README and integration guide include the selected overview and tool-call sequence diagrams, editable Excalidraw sources, a Hacker News quickstart, approval examples, and a retained Cloud terminal/browser capture. The diagrams place Bash in the Browser Use tool collection and explain where it executes.

Validation:
- Compatible SDK and Cloud client suite: 21 passed, 1 expected skip; earlier full compatibility checks also cover SDK versions without the browser toolset.
- Latest deterministic Cloud audit: 13 checks passed, including approval denial/error handling, browser-host file reupload, and cleanup.
- Separate Hacker News audit produced reviewed Markdown/JSON and a screenshot, but its local runner startup and overall cleanup remain unresolved. This is not reported as a complete passing audit.
- Regression tests cover a detached child holding stdout open, task cancellation, Cloud cleanup through the selected API version, and scope renegotiation on new creation.
- Pre-commit, Python snippet parsing, exact docs/quickstart comparison, SVG/Excalidraw validation, and desktop/mobile documentation rendering passed.

This PR contains Browser Use code only; it does not vendor or publish Anthropic's SDK. The exact public Anthropic browser-toolset package smoke remains outstanding, and the documentation states the required APIs explicitly.
