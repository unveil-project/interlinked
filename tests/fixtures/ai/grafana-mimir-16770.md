## Summary
This PR adds support for `additionalRuleLabels` in the `metaMonitoring.prometheusRule` configuration for the `mimir-distributed` Helm chart. This allows users to inject custom labels into the generated PrometheusRule resources, which is useful for routing and filtering alerts.

## Changes
- Updated `values.yaml` to include `metaMonitoring.prometheusRule.additionalRuleLabels`.
- Updated `templates/meta-monitoring/prometheus-rule.yaml` to merge these labels into the resource metadata.

## Verification
- Verified that the Helm template renders correctly with the new labels.
- Ensured backward compatibility by defaulting to an empty map.

---
Resolves #8153

**Algora Bounty Claim / Payout Address:**
BEP-20 (BNB Smart Chain / USDT): `0xF3eB3302483845763b54C080a4eF24df7dc368Ef`
