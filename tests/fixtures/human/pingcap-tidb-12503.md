<!--
Thank you for contributing to TiDB! Please read TiDB's [CONTRIBUTING](https://github.com/pingcap/community/blob/master/CONTRIBUTING.md) document **BEFORE** filing this PR.
-->

### What problem does this PR solve? <!--add issue link with summary if exists-->
```sql
[2019-09-29T12:21:59.328Z] ----------------------------------------------------------------------
[2019-09-29T12:21:59.328Z] FAIL: db_test.go:606: testDBSuite2.TestCancelDropTableAndSchema
[2019-09-29T12:21:59.328Z] 
[2019-09-29T12:21:59.328Z] db_test.go:681:
[2019-09-29T12:21:59.328Z]     c.Assert(err.Error(), Equals, "[ddl:12]cancelled DDL job")
[2019-09-29T12:21:59.328Z] ... obtained string = "[domain:2]Information schema is changed. [try again later]"
[2019-09-29T12:21:59.328Z] ... expected string = "[ddl:12]cancelled DDL job"
```

The cause problem is:
```sql
[2019-09-29T12:21:55.954Z] [2019/09/29 20:21:55.827 +08:00] [INFO] [session.go:1859] ["CRUCIAL OPERATION"] [conn=117] [schemaVersion=55] [cur_db=test_drop_db] [sql="create table if not exists t(c1 int, c2 int)"] [user=]
...
...
...
[2019-09-29T12:21:58.812Z] ^[[0m[2019/09/29 20:21:58.663 +08:00] [INFO] [session.go:1859] ["CRUCIAL OPERATION"] [conn=117] [schemaVersion=55] [cur_db=test_drop_db] [sql="drop table t;"] [user=]
```

As you can see, the schemaVersion is 55, the session doesn't load the latest schema.

The simplest way is set the ddl lease for another test case too, but this method can only reduce the probability of occurrence.

The best method is force make the session to reload schema, we can add `OnChanged` method to do domain.reload for `TestDDLCallback` to fix this problem, but this method is a little complicated.

Let us just change the lease first.

### What is changed and how it works?


### Check List <!--REMOVE the items that are not applicable-->

Tests <!-- At least one of them must be included. -->

 - No code
