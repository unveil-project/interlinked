### Description

The Leader Migration examples cannot be loaded as written: the wildcard components are unquoted YAML aliases, the Node IPAM component is outside its controller entry, and all four `v1` examples contain an unsupported `resourceLock` field.

Quote the wildcards, keep the Node IPAM component under its controller, and remove `resourceLock`. The [v1 API conversion](https://github.com/kubernetes/controller-manager/blob/v0.37.1/config/v1/conversion.go) always selects Lease locks.

All four examples pass the production controller-manager v0.37.1 configuration reader and validator, including the expected controller mappings and Lease defaults. The page renders successfully with Hugo Extended 0.144.2, and its rendered examples also pass the same validator. This validates configuration loading rather than a live leader migration.

### Issue

No linked issue; corrections to the existing configuration examples.

### Special notes for your reviewer

This documentation change was prepared with OpenAI Codex assistance to diagnose and correct the configuration examples and run the validation described above.
