<!-- Thank you for contributing to TiDB!

PR Title Format:
1. pkg [, pkg2, pkg3]: what's changed
2. *: what's changed

-->

### What problem does this PR solve?

As the title said, here is an example:

```sql
create table t (a int) partition by list (a) (partition p0 values in (1,2), partition p1 values in (3,4));
insert into t values (1),(3);
```

Before this PR:

```sql
> desc select * from t where a=1;
+------------------------+---------+-----------+-----------------------+--------------------------------+
| id                     | estRows | task      | access object         | operator info                  |
+------------------------+---------+-----------+-----------------------+--------------------------------+
| PartitionUnion_8       | 0.00    | root      |                       |                                |
| ├─TableReader_11       | 0.00    | root      |                       | data:Selection_10              |
| │ └─Selection_10       | 0.00    | cop[tikv] |                       | eq(test.t.a, 1)                |
| │   └─TableFullScan_9  | 1.00    | cop[tikv] | table:t, partition:p0 | keep order:false, stats:pseudo |
| └─TableReader_14       | 0.00    | root      |                       | data:Selection_13              |
|   └─Selection_13       | 0.00    | cop[tikv] |                       | eq(test.t.a, 1)                |
|     └─TableFullScan_12 | 1.00    | cop[tikv] | table:t, partition:p1 | keep order:false, stats:pseudo |
+------------------------+---------+-----------+-----------------------+--------------------------------+
```

This PR:

```sql
> desc select * from t where a=1;
+---------------------+----------+-----------+-----------------------+--------------------------------+
| id                  | estRows  | task      | access object         | operator info                  |
+---------------------+----------+-----------+-----------------------+--------------------------------+
| TableReader_9       | 10.00    | root      |                       | data:Selection_8               |
| └─Selection_8       | 10.00    | cop[tikv] |                       | eq(test.t.a, 1)                |
|   └─TableFullScan_7 | 10000.00 | cop[tikv] | table:t, partition:p0 | keep order:false, stats:pseudo |
+---------------------+----------+-----------+-----------------------+--------------------------------+
3 rows in set
```

As you can see, for the condition of `a=1`, TiDB only needs to query data from the partition `p0`, not all the partition.

### What is changed and how it works?



### Related changes

- N/A

### Check List <!--REMOVE the items that are not applicable-->

Tests <!-- At least one of them must be included. -->

- Unit test

Side effects

- N/A

### Release note <!-- bugfixes or new feature need a release note -->

- Add partition pruner for list (columns) partition