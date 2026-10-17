## Summary
`appendMessage` in `js-modules/voice/voice-assistant-widget.js` escapes user
messages via `escapeHTML()`, but bot messages (`className !== 'user-message'`)
are inserted into the DOM unescaped. If a bot response ever contains HTML or
script content, it will execute in the user's browser — a stored/reflected XSS
vector.

## Location
`js-modules/voice/voice-assistant-widget.js:56` (inside `appendMessage`)

```js
const content = className === 'user-message' ? escapeHTML(text) : text;
msgDiv.innerHTML = `<div class="message-content">${content}</div>`;
```

## Severity
High: likely exploitable if bot message content can ever be influenced by
untrusted input (e.g., echoed user input, a third-party voice/LLM API
response, etc.).

## Proposed Fix
Apply `escapeHTML()` uniformly to all messages regardless of `className`:

```js
const content = escapeHTML(text);
```

## Acceptance Criteria
- [ ] Bot messages are HTML-escaped before insertion into the DOM
- [ ] User messages remain escaped (no regression)
- [ ] Add regression tests covering script/HTML injection payloads in bot
      messages (e.g. `<img onerror>`, `<svg onload>`, `<iframe>` payloads)
- [ ] Confirm no existing bot messages rely on intentional HTML formatting
      (bold, links, line breaks) that this change would break
