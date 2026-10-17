During graceful shutdowns, client connections are closed and
eventually and THD::awake() acquires LOCK_thd_data mutex which is
required later on in wsrep_thd_is_aborting(). Make sure LOCK_thd_data
is acquired, even if global wsrep_on is disabled.