An unclosed link or image label (`[` / `![`) earlier on a line causes a later, valid inline code span to be rendered as literal text.

### Minimal example

Input:

```
[foo `bar` baz`
```

- markdown-it demo (CommonMark strict): <https://markdown-it.github.io/#md64=eyJzb3VyY2UiOiJbZm9vIGBiYXJgIGJhemAiLCJkZWZhdWx0cyI6eyJodG1sIjpmYWxzZSwieGh0bWxPdXQiOmZhbHNlLCJicmVha3MiOmZhbHNlLCJsYW5nUHJlZml4IjoibGFuZ3VhZ2UtIiwibGlua2lmeSI6dHJ1ZSwidHlwb2dyYXBoZXIiOnRydWUsIl9oaWdobGlnaHQiOnRydWUsIl9zdHJpY3QiOnRydWUsIl92aWV3IjoiaHRtbCJ9fQ==>
- CommonMark dingus: <https://spec.commonmark.org/dingus/?text=%5Bfoo%20%60bar%60%20baz%60>

Output:

```
markdown-it 15.0.0:   <p>[foo `bar` baz`</p>          (code span dropped, all literal)
CommonMark reference: <p>[foo <code>bar</code> baz`</p>
```

The same happens for image labels and for the default/zero presets:

```
![alt `code` x`
markdown-it:  <p>![alt `code` x`</p>
reference:    <p>![alt <code>code</code> x`</p>
```

Minimal trigger: `` [`a`b` ``. Removing the leading bracket (`` a`a`b` ``, `` *`a`b` ``) makes markdown-it agree with the reference again, which points at the label lookahead rather than the backtick rule itself.

### Why it matters

Code spans bind more tightly than links (CommonMark 0.31.2 §6.1 and the precedence rule), so this is a spec divergence on valid input. It slips past the bundled `spec.txt` suite only because no spec example combines an unclosed label with a trailing unmatched backtick run.

### Cause (from a look at the source)

`parseLinkLabel` searches for a label's closing `]` by running the inline rules in silent mode via `skipToken`. The backtick rule's scan memo (`state.backticks` and the `state.backticksScanned` latch added in 8cd6fc3 for the #736 quadratic-backtick fix) is shared through that lookahead. `backticksScanned` is only meaningful for a single monotonic left-to-right scan, but the lookahead consumes a code span (hiding its closing backtick run from the cache) and scans to end-of-line (flipping `backticksScanned = true`) with an incomplete cache. When the label turns out not to be a link, the real parse of the earlier opener then hits the false-literal guard `state.backticksScanned && (state.backticks[openerLength] || 0) <= start` and emits literal backticks despite a real closer existing.

`parseLinkLabel` is a pure lookahead — it already saves and restores `state.pos` — but it does not isolate this scan memo.

### Proposed scope

Give the label lookahead its own throwaway backtick cache and restore the caller's afterward, exactly as `state.pos` is already handled. The restore is an O(1) reference swap, so the #736 quadratic guard is preserved. Happy to open a PR (branch ready, with fail-then-pass fixtures in `commonmark_extras.txt` and a full green `npm test`) if this scope looks right.
