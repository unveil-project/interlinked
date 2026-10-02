Stack from [ghstack](https://github.com/ezyang/ghstack/tree/0.15.0) (oldest at bottom):
* __->__ #199416

When every compiled config of a kernel fails to launch with OutOfResources or OOM, `_make_launchers` silently recompiles with `num_stages=1`, which disables software pipelining and can make the kernel much slower with no indication why. This logs the launch error at debug level before the retry.

Test Plan:
Logging-only change; existing `test/inductor/test_triton_heuristics.py` tests cover the retry path.

This PR was authored with Claude Code.

cc @voznesenskym @penguinwu @EikanWang @jgong5 @Guobing-Chen @XiaobingSuper @zhuhaozhe @blzheng @wenzhe-nrv @jiayisunx @ipiszy @kadeng @muchulee8 @amjames @chauhang @aakhundov @coconutruben @jataylo
