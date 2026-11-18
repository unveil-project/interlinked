### Bug summary

`DockerImage(context=project_dir, dockerfile="auto")` forwards the selected context to the builder but generates its temporary Dockerfile in the current working directory. The selected context therefore has no generated Dockerfile. An unrelated Dockerfile in the current directory instead causes a "Dockerfile already exists" error.

This remains after #17535 fixed context forwarding for #17534. Both current docker-py and buildx paths call `generate_default_dockerfile()` without the selected context.

### Reproduction

No Docker daemon is needed. This checks the real generated file at the external build boundary:

```python
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from prefect.docker import DockerImage

original_cwd = Path.cwd()
try:
    with TemporaryDirectory() as directory:
        root = Path(directory)
        project = root / "project"
        project.mkdir()
        os.chdir(root)

        def inspect_build(**kwargs):
            print("context:", Path(kwargs["context"]).name)
            print("Dockerfile in context:", (project / "Dockerfile").exists())
            print("Dockerfile in cwd:", (root / "Dockerfile").exists())

        with patch("prefect.docker.docker_image.build_image", side_effect=inspect_build):
            DockerImage(name="example", tag="latest", context=project).build()
finally:
    os.chdir(original_cwd)
```

Actual: `context: project`, `Dockerfile in context: False`, `Dockerfile in cwd: True`.

Expected: the automatic Dockerfile should be created inside the selected context, use that directory's requirements and be removed after the build.

### Version and scope

Reproduced on main `60d9ea54535ee10be2e7481fd1d930815c87b649`, Prefect `3.9.0+152.g60d9ea5453`, Python 3.12.14, Linux. Six focused regression cases fail on unchanged source across the two backends; both default-context controls pass. Filesystem and generation are real; only the external Docker build call is mocked. No live Docker build or deployment is claimed.

I plan to pass the selected context into the existing generator in both backends and cover cleanup and default-context compatibility. Prepared and independently reproduced with Codex.