noticed the pre-pull sidecar was missing resource limits, which kept pod-level memory cgroups unlimited on some distros. added the same resource block to this container so memory limits apply properly to the entire pod. tested and verified locally on development environment.

Closes #13820