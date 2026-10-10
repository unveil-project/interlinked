Backport focused fixes for 0.29 regressions so users can recover without upgrading to 0.30. Includes the selected policy fixes from [#3501](https://github.com/juanfont/headscale/pull/3501), rather than its full refactor. Internal Go APIs change; HTTP/gRPC schemas and dependencies remain compatible.

Reuse compiled integration tests and prebuilt images from [#3542](https://github.com/juanfont/headscale/pull/3542). Backport stable via-netmap assertions from [#3524](https://github.com/juanfont/headscale/pull/3524), bound in-memory fixture batching, and wait for the state being asserted. The unit workflow keeps its original parallelism and timeout.

Validation: all 184 GitHub checks passed on `9f0c17014512b3567426003e048e3f6d1e2645e0`, including the full integration matrix, without reruns on this head. GitHub unit tests passed (16,117 tests, 183 skipped; server package 123.19s). The local full server suite passed with `CI=true GOMAXPROCS=2` in 216.939s. Commit hooks passed.

The local monolithic server race run reached its 10-minute aggregate limit. Splitting the suite covered all enabled cases: one rapid-reconnect stress assertion failed in the bulk run, then passed three isolated repetitions and a rerun of its whole test group. No data races were reported.

Updates [#3493](https://github.com/juanfont/headscale/issues/3493), [#3502](https://github.com/juanfont/headscale/issues/3502), [#3508](https://github.com/juanfont/headscale/issues/3508), [#3513](https://github.com/juanfont/headscale/issues/3513), [#3531](https://github.com/juanfont/headscale/issues/3531), [#3535](https://github.com/juanfont/headscale/issues/3535)

> Generated with the help of an AI assistant
