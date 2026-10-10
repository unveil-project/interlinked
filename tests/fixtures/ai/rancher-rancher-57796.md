## Issue: https://github.com/rancher/rancher/issues/57385

## Problem

Importing a cluster with the generated `kubectl apply` command can leave it stuck at `Connected=False`. The `/v3/import` manifest renders the cluster agent without `CATTLE_FEATURES`, so the agent starts with `multi-cluster-management-agent` off and doesn't start the embedded Rancher until the cluster deploy controller redeploys it.

## Solution

`ClusterImportHandler` now passes `systemtemplate.GetDesiredFeatures(cluster)` as the agent features, same as the cluster deploy controller and `ForCluster`. Based on the line @ChrisMcKee posted in https://github.com/rancher/rancher/issues/57385

## Testing

### Automated Testing
* Test types added/modified:
    * Unit

`TestClusterImportHandler_AgentFeatures` reads `CATTLE_FEATURES` from the served manifest of a new and an imported RKE2 cluster. `go test ./pkg/api/norman/customization/clusterregistrationtokens/`

## QA Testing Considerations

Check `CATTLE_FEATURES` on `cattle-cluster-agent` after the first apply of the generated manifest.

### Regressions Considerations

Low. The served manifest only gains the `CATTLE_FEATURES` env var.

I used Claude/Codex to assist with preparing, checking and double-checking this change.

Co-authored-by: Chris McKee <83597+ChrisMcKee@users.noreply.github.com>
