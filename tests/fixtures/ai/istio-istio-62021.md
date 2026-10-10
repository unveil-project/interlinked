**Please provide a description of this PR:**

When a Service revision tag points to revision B while a MutatingWebhookConfiguration for the same tag still points to A, both watchers currently claim the tag. This can make both revisions manage resources selected by it.

Give Service tags precedence across revisions while preserving direct revision-name ownership. Add regression coverage for both watchers, handler notifications, object and namespace selection, Service updates, and deletion fallback, plus a release note.

Validation: package and race tests for `pkg/revisions`, the `gatewaycommon` package tests, and scoped repository lint passed. With real Kubernetes API informers, the old code reproduced dual ownership; the fix selected the Service revision and correctly transferred ownership on updates and restored webhook ownership after deletion.