Should solve the problem of flakes documented here:
https://github.com/etcd-io/etcd/issues/12372#issuecomment-706337969

```
% (cd tests && env go test -short -timeout=3m -cpu=4 --race=true ./... -p=2)

Unexpected goroutines running after all test(s).
1 instances of:
go.etcd.io/etcd/v3/clientv3.(*watchGrpcStream).sendCloseSubstream(...)
	/go/src/go.etcd.io/etcd/clientv3/watch.go:464 +0x204
created by go.etcd.io/etcd/v3/clientv3.(*watchGrpcStream).closeSubstream
	/go/src/go.etcd.io/etcd/clientv3/watch.go:480 +0x21f
FAIL	go.etcd.io/etcd/tests/v3/integration/clientv3/examples	2.111s
```

The goroutine finishes automatically with timeout of 250ms.The change
makes the test wait for it - if it still exists.

Examples:
  https://travis-ci.com/github/etcd-io/etcd/jobs/397449189
  https://travis-ci.com/github/etcd-io/etcd/jobs/397532784
  https://travis-ci.com/github/etcd-io/etcd/jobs/397696506
  https://travis-ci.com/github/etcd-io/etcd/jobs/403603526


Please read https://github.com/etcd-io/etcd/blob/master/CONTRIBUTING.md#contribution-flow.
