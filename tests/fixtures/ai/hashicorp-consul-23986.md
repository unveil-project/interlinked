
## Backport

This PR is auto-generated from #23971 to be assessed for backporting due to the inclusion of the label backport/2.0.



The below text is copied from the body of the original PR.

---

Add a Content-Security-Policy header to Consul UI responses to mitigate XSS and data injection attacks.

## Changes
- Set CSP on HTML responses from the Consul UI:
  `default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`
- Wrap the response writer to detect HTML responses and add the header. Non-HTML responses (CSS, JS, etc.) are not affected.
- Keep any `Content-Security-Policy` an operator sets via `http_config.response_headers` instead of overwriting it.
- UI: move the OIDC callback's inline script into `oidc/callback.js` so `script-src` doesn't need `'unsafe-inline'`, and exclude that file from fingerprinting since the extensionless `oidc/callback` page references it by name.

## Notes
- `style-src 'unsafe-inline'` is still required: the UI injects `<style>` elements (e.g. CodeMirror) and uses inline `style` attributes.
- The committed `agent/uiserver/dist` snapshot is not regenerated here. Release builds rebuild the UI from `ui/`, so they include the new callback script.

## Testing
- Built the current UI (`ember build --environment=production`) and served it from a binary built from this branch.
- Loaded 16 UI routes and the ACL pages (with ACLs enabled) in Chromium and WebKit with the policy enforced: no CSP violations or page errors, and the code editor, dropdowns and pages behave the same as with CSP disabled.
- The OIDC callback page loads `callback.js`, stores the callback URL and closes the popup.
- A CSP set in `http_config.response_headers` is preserved on UI pages; without one, the default policy above is sent.
- `go test ./agent/uiserver/` and the UI header tests in `./agent` pass.

## Security Impact
Fixes DAST vulnerability: Content Security Policy (CSP) Header Not Set.


---

<details>
<summary> Overview of commits </summary>

 
  - 4c6f2dacb442be3afbc5c32e781a5affae309d3d
 

</details>


