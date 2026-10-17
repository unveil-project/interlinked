## Summary
- Parse stale cache extensions even after restrictive directives or zero cache lifetimes
- Preserve cache restrictions while allowing a later X-Accel-Expires override without losing extension values

Fixes nginx/nginx#1821
Regression tests: https://github.com/nginx/nginx-tests/pull/131

## Validation
- Before fix: 20 of 182 regression assertions fail
- After fix: all 204 targeted assertions pass
- `prove -j4 -v *cache*.t`: PASS, 579 reported assertions
- Cache-enabled and cache-disabled builds, Perl syntax, and whitespace checks pass
- Eight files skipped for missing dependencies or page-size constraints
- Three expected TODO failures also reproduce on unmodified nginx
- Twelve initially skipped long-running Vary assertions pass in a separate run
- Local validation on macOS only, GitHub CI pending
