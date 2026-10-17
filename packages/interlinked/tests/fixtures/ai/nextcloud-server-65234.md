## Summary

When an upgrade is required and `config.php` is not writable, `OC::checkConfig()` always showed the generic “Cannot write into config directory” hint that tells admins to set `config_is_read_only` — even when that option is already `true`.

- If an upgrade is needed and config is not writable while `config_is_read_only` is set: explain that the update requires temporarily unsetting the flag, making the config directory writable, running the upgrade, then restoring read-only mode (matches admin docs).
- If an upgrade is needed and config is not writable without the read-only flag: ask for write access only (do not suggest enabling `config_is_read_only`).
- Non-upgrade permission path unchanged (still offers the optional read-only setting).

Closes #29583

## Test plan

- [ ] With `config_is_read_only => true`, config dir not writable, and a pending upgrade (`version` in config older than code): CLI/web shows the new read-only + upgrade message (mentions temporarily unsetting `config_is_read_only`); does **not** tell you to set the flag.
- [ ] Same pending upgrade, config not writable, `config_is_read_only` unset/false: message asks for write access; does **not** suggest setting `config_is_read_only`.
- [ ] No upgrade pending, config not writable, `config_is_read_only` unset: existing permission + “set config_is_read_only” hint still appears.
- [ ] No upgrade pending, `config_is_read_only => true`, config not writable: instance still boots (no false config error from this check).
- [ ] Normal writable config + upgrade path still reaches the updater as before.

---

### AI disclosure

This PR was drafted with the help of AI coding assistants (Cursor agents / LLM-based tools), including the description. I am responsible for it and happy to rework anything that doesn't fit.

All commits carry an `Assisted-by: Cursor:grok-4.7` trailer.

