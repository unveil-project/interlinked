### Description

We use AKS, and have a private docker registry mirror configured (mainly for cache and to avoid rate limiting),

We have set up the config below, to configure our private mirror, and - as a fallback - the original registry.

It works well, as long as the private registry (mirror) runs. But if we shut it down, Containerd does not fallback to the second host.

This issue is might be related to https://github.com/containerd/containerd/issues/4531 and https://github.com/containerd/containerd/issues/3850

Maybe I misconfigured the Containerd, that's why it doesn't fallback to the second "mirror". In this case, sorry for the new ticket, but please help me set it up right.

### Steps to reproduce the issue

1. Set up the mirror config with multiple hosts.
2. Make sure the first host is not available.
3. Try to run a new pod.
4. The image pull fails.


### Describe the results you received and expected

It works if the first mirror runs. We see in the mirror's logs that the Containerd pulls the image from that.

But if we shutdown the mirror (to simulate an failure event), Containerd does not falls back to the second host in the config:
```
Events:
  Type     Reason     Age                  From               Message
  ----     ------     ----                 ----               -------
  Normal   Scheduled  2m41s                default-scheduler  Successfully assigned default/mygitlabtestpod to aks-spot-20739921-vmss00000m
  Normal   Pulling    74s (x4 over 2m41s)  kubelet            Pulling image "registry.gitlab.com/privategroup/infra/kube-deploy:1.4"
  Warning  Failed     74s (x4 over 2m40s)  kubelet            Failed to pull image "registry.gitlab.com/privategroup/infra/kube-deploy:1.4": rpc error: code = Unknown desc = failed to pull and unpack image "registry.gitlab.com/privategroup/infra/kube-deploy:1.4": failed to resolve reference "registry.gitlab.com/privategroup/infra/kube-deploy:1.4": failed to do request: Head "http://docker-mirror.privatedomain.com:5100/v2/privategroup/infra/kube-deploy/manifests/1.4?ns=registry.gitlab.com": dial tcp 10.0.X.Y:5100: connect: connection refused
  Warning  Failed     74s (x4 over 2m40s)  kubelet            Error: ErrImagePull
  Warning  Failed     60s (x6 over 2m40s)  kubelet            Error: ImagePullBackOff
  Normal   BackOff    45s (x7 over 2m40s)  kubelet            Back-off pulling image "registry.gitlab.com/privategroup/infra/kube-deploy:1.4"
```

### What version of containerd are you using?

containerd://1.5.11+azure-2

### Any other relevant information

_No response_

### Show configuration if it is related to CRI plugin.

$ cat /host/etc/containerd/certs.d/registry.gitlab.com/hosts.toml
server = "https://registry.gitlab.com"
[host."http://docker-mirror.privatedomain.com:5100"]
  capabilities = ["pull", "resolve"]
[host."https://registry.gitlab.com"]
  capabilities = ["pull", "resolve"]
