This PR adds `retainLast` method to `ExpireSnapshots`.

- find nth snapshot if it's available.
- if nth snapshot is not null, add nth snapshot's `timestampMillis` to `expireOlderThan`.