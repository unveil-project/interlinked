Related issue: #34728

**Description**

Fixes #34728. On the WebGL2 backend of `WebGPURenderer`, `WebGLBackend.clear()` re-enabled the depth and stencil write masks but not the color one, so after a draw with `colorWrite: false` the next color clear was masked out and the render target kept its old content. The change calls `setColorMask( true )` before clearing color, and adds a regression test that fails without it.
