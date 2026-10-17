Original commit message:

    [JSON] Fix GC issue in BuildJsonObject
    We must ensure that the sweeper is not running or has already swept
    mutable_double_buffer. Otherwise the GC can add it to the free list.

    Bug: v8:11837
    Change-Id: Ifd9cf15f1c94f664fd6489c70bb38b59730cdd78
    Reviewed-on: https://chromium-review.googlesource.com/c/v8/v8/+/2928181
    Commit-Queue: Victor Gomes <victorgomes@chromium.org>
    Reviewed-by: Toon Verwaest <verwaest@chromium.org>
    Reviewed-by: Dominik Inführ <dinfuehr@chromium.org>
    Cr-Commit-Position: refs/heads/master@{#74859}

Refs: v8/v8@81181a8

Fixes: #37553

---

Sorry if I've got this wrong; I've tried to follow the v8 patch contribution guidelines, but this is my first time and C++ is not my best language 😄 

Some additional context:

* this is an v8 fix for a bug causing failure on AWS lambda (which tracks  node 14)
* therefore I think it's a good candidate for a backport
* this fix was backported in v8 from master to v9.2.230.13 (https://chromium-review.googlesource.com/c/v8/v8/+/2988414)
* if I understand correctly, this means the fix hasn't hit node 16, but it will be picked up in time because node 16 is tracking v8 9.2.X
* the node 14 v8 code has diverged enough that I had to apply this patch manually (which was easy, given how small it is!)

<!--
Before submitting a pull request, please read
https://github.com/nodejs/node/blob/HEAD/CONTRIBUTING.md.

Commit message formatting guidelines:
https://github.com/nodejs/node/blob/HEAD/doc/guides/contributing/pull-requests.md#commit-message-guidelines

For code changes:
1. Include tests for any bug fixes or new features.
2. Update documentation if relevant.
3. Ensure that `make -j4 test` (UNIX), or `vcbuild test` (Windows) passes.

Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
-->

