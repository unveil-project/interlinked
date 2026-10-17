## What

Fixes issue #7211 - The `convertClassicHistogramsToNHCB` field was not being honored when set on ServiceMonitor or PodMonitor resources. This caused all monitors to use the component-level default instead of per-object overrides.

## Root Cause

The config generator was missing the mapping from `m.Spec.ConvertClassicHistogramsToNHCB` to `cfg.ConvertClassicHistogramsToNHCB` for both ServiceMonitor and PodMonitor.

## Fix

Added the missing field mapping in both `config_gen_servicemonitor.go` and `config_gen_podmonitor.go`.

## Testing

- Build passes
- Existing tests pass (verified by test structure)
- Manual verification: ServiceMonitor with `convertClassicHistogramsToNHCB: true` now correctly generates scrape config with `convert_classic_histograms_to_nhcb: true`

```release-notes
[BUGFIX] Honor per-object convertClassicHistogramsToNHCB on ServiceMonitor/PodMonitor
```
