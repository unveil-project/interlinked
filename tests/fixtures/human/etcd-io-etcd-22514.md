Remove the upper bound verification checks in validateConsistentIndex since backend ConsistentIndex can validly advance past the last persisted WAL HardState commit during crash recovery or due to unstable entries.

Fixes https://github.com/etcd-io/etcd/issues/22028