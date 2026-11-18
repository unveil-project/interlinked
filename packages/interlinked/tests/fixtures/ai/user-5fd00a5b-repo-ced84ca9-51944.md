<!-- CURSOR_AGENT_PR_BODY_BEGIN -->
About a quarter of failed self-hosted Studio E2E runs in the last two weeks die at "Start supabase" (`supabase start --exclude studio,mailpit --workdir ./e2e/studio`) with `address already in use` binding `0.0.0.0:54322`, in a single shard, on both next and tanstack. The local ports in `e2e/studio/supabase/config.toml` sit inside Linux's ephemeral range, so an outbound connection during the image pull can take 54322; `ss -tlnp` only lists listeners, which is why diagnostics reported the port free. This reserves `54320-54329` before installs and image pulls, keeping any ports already reserved, and snapshots sockets on that range when `supabase start` fails. Follows up the diagnostics from #45637 and #46607.

**Changed:**
- `.github/workflows/studio-e2e-test.yml` – append `54320-54329` to `net.ipv4.ip_local_reserved_ports` before dependency install, Playwright install, and image pulls, so an outbound connect cannot occupy them and any ports the runner already reserved stay reserved.
- `.github/workflows/studio-e2e-test.yml` – when `supabase start` fails, snapshot TCP sockets on `54320-54329` immediately, before the build finishes and a short-lived socket from the image pull is gone.
- `.github/workflows/studio-e2e-test.yml` – pre-start diagnostics print the ephemeral port range and sockets on `54320-54329`; failure diagnostics use the same filter and group the last 300 log lines per container.

## To test
- [x] "Reserve Supabase local ports" step prints `54320-54329` on every E2E shard
- [x] All Studio E2E shards pass on next and tanstack
- [ ] (on a future failure) the Start supabase step lists any socket on 54320-54329

<!-- CURSOR_AGENT_PR_BODY_END -->

<div><a href="https://cursor.com/agents/bc-e6e0ed7f-4b63-547e-aa51-ae1b4588d445?cursor_ref=pr_footer&cursor_cta=open_in_web"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/assets/images/open-in-web-dark.png"><source media="(prefers-color-scheme: light)" srcset="https://cursor.com/assets/images/open-in-web-light.png"><img alt="Open in Web" width="114" height="28" src="https://cursor.com/assets/images/open-in-web-dark.png"></picture></a>&nbsp;<a href="https://cursor.com/background-agent?bcId=bc-e6e0ed7f-4b63-547e-aa51-ae1b4588d445&cursor_ref=pr_footer&cursor_cta=open_in_cursor"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/assets/images/open-in-cursor-dark.png"><source media="(prefers-color-scheme: light)" srcset="https://cursor.com/assets/images/open-in-cursor-light.png"><img alt="Open in Cursor" width="131" height="28" src="https://cursor.com/assets/images/open-in-cursor-dark.png"></picture></a>&nbsp;</div>

