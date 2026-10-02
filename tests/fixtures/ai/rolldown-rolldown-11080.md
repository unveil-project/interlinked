Related to #11057

The async `transform` task only borrowed the `TsconfigCache`. If the JS cache object was garbage collected while the task was still queued, the task read freed memory and the process crashed.

The task now owns a clone of the cache, which shares the same resolver and cache map.
