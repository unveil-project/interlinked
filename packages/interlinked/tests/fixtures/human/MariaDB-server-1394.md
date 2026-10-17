When stored procedure execution was chosen as victim for a BF abort, the old implementation called for rollback immediately
when execution was inside SP instruction. Technically this happened in wsrep_after_statement() call, which identified the
need for a rollback.
The problem was that MariaDB does not accept rollback (nor commit) inside sub statement, there are several asserts about it,
checking for THD::in_sub_stmt.

This patch contains a fix, which skips calling wsrep_after_statement() for SP execution, which is marked as BF must abort. Instead,
we return error code to upper level, where rollback will eventually happen, outside of SP execution.
Also, appending the affected trigger table (dropped or created) in the populated key set for the write set,
which prevents parallel applying of other transactions working on the same table.