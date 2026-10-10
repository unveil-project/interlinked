Fixes #4851

## Problem

In tree.go, getValue maintains a backtrack stack in *skippedNodes to explore alternative matching branches when routing requests. During traversal, whenever a node with a wildcard child is encountered, a new backtrack frame is pushed by reslicing *skippedNodes:
```go
index := len(*skippedNodes)
*skippedNodes = (*skippedNodes)[:index+1]
(*skippedNodes)[index] = ...
```

Contexts are pooled in Engine.pool with skippedNodes allocated to an initial capacity of engine.maxSections. When additional routes are registered after requests have already been served (and contexts pooled), engine.maxSections increases, but existing pooled contexts retain their smaller skippedNodes capacity. If a subsequent request traversing through such a context requires more backtrack frames than the pooled slice capacity, (*skippedNodes)[:index+1] panics with:
```
runtime error: slice bounds out of range
```

## Solution

Replace the raw reslice with append:
```go
*skippedNodes = append(*skippedNodes, skippedNode{...})
```
When len(*skippedNodes) < cap(*skippedNodes), append updates the slice in-place without heap allocations. When len >= cap, Go runtime dynamically reallocates and grows the slice backing array, updating the slice header pointed to by *skippedNodes. The expanded capacity is subsequently preserved when the context is returned to the pool and reused across requests.

## Testing

- Added TestLateRouteRegistrationSkippedNodes in gin_test.go reproducing the late route registration and backtrack scenario on Engine.
- Added TestTreeSkippedNodesDynamicGrowth in tree_test.go directly verifying getValue backtracking when skippedNodes capacity is smaller than required frames.
- Verified 100% test pass with go test -v . and go test -race .