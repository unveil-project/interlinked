The problem seems to be that the SceneGrab allocates the texture with dimension device.width x device.width, instead of basing it of a render target for the camera the grab pass executes for.
