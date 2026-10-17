### Description

`ReferenceCountedChannel#blockingGet` now cancels its future, and thereby disposes of its subscription to the connection pool, when the caller blocked on the future is interrupted.

### Motivation

If all connection permits were occupied and the caller was interrupted, the queued subscription stayed active after the caller had exited, so returning a permit later started the abandoned callback on the thread returning the permit. Reported in https://github.com/bazelbuild/bazel/pull/31452#issuecomment-5971610013.

Work towards #31456

### Build API Changes

No

### Release Notes

RELNOTES: None

Closes #31517

COPYBARA_INTEGRATE_REVIEW=https://github.com/bazelbuild/bazel/pull/31517 from fmeum:channel-cancel-on-interrupt f1216c0aca7d386c59e70ffba4893c7527299e94
PiperOrigin-RevId: 995686296
Change-Id: Ib62c96cf466d25bf586432820d58011596522f2c

Commit https://github.com/bazelbuild/bazel/commit/d2e1bf1105bbe3e13b19d7d821503cd0fbdeafb6