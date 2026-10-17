The issue is pretty much that `argv[0]` gets set to `./this.program`, with the newer emscripten versions, and parameters are only added after this into the `argv` array.
(@fidli was talking about this in #32117.)

This is a really simple, no-refactor fix. I'm not familiar enough with emscripten yet to be able to make a more roboust solution, but at the very least it shows where the actual problem is.

By the way I found https://github.com/emscripten-core/emscripten/issues/2431.
This is exactly the same thing, maybe they reintroduced this?

I've tested this with both the `1.38.27`, and `master` emsdk.

fixes #32117
fixes #32422