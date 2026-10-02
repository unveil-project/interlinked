> [!IMPORTANT]
>
> 1. Make sure you have read our [contribution guidelines](https://github.com/langgenius/dify/blob/main/CONTRIBUTING.md)
> 1. Ensure there is an associated issue
> 1. Use the correct syntax to link this PR: `Fixes #<issue number>`.

## Summary

Fixes #43312 (regression of #26367).

When workflow execution moved into the Graphon package, iteration subgraphs stopped propagating `conversation.*` variable updates back to the parent variable pool. Conversation variables written inside an iteration were visible during the iteration but reverted after it finished, breaking downstream Answer nodes.

This PR registers a Dify `IterationContainerHandler` subclass that syncs conversation-scoped variables from each completed iteration frame to the parent pool before scheduling the next frame. The table-driven regression test from #26368 is restored.

## Screenshots

| Before | After |
| ------ | ----- |
| n/a | n/a |

## Checklist

- [ ] This change requires a documentation update, included: [Dify Document](https://github.com/langgenius/dify-docs)
- [x] I understand that this PR may be closed in case there was no previous discussion or issues. (This doesn't apply to typos!)
- [x] I've verified the change and added or updated tests where meaningful regression risk justifies coverage.
- [ ] I've updated the documentation accordingly.
- [ ] I ran `make lint && make type-check` (backend) and `vp staged` (frontend) to appease the lint gods
