## 🐛 Bug Report

After I edited the `.env` file and changed the `_APP_DOMAIN` and `_APP_DOMAIN_TARGET` variables (in order to change from an old domain to a new domain), I experienced an issue. It didn't show any errors, but it also didn't change the endpoint or the domain. 

## Have you spent some time to check if this issue has been raised before?

I have been told by @kodumbeats to raise an issue here :)

## To Reproduce

1. Create a test appwrite project with a custom domain.
2. Change the `.env` variables `_APP_DOMAIN` and `_APP_DOMAIN_TARGET` to a new domain.
3. Restart appwrite container
4. Try to access appwrite via the new domain.

## Expected behavior

I thought, it would change the domain of my appwrite page to the new domain. 

## Actual Behavior

It didn't change anything, and didn't show any errors.

## Your Environment

I tried it on appwrite 0.9.3 and 0.9.4, which were set up on a:
Static hostname: expirapp
Icon name: computer-vm
Chassis: vm
Machine ID: a9a196fec3b142eabb1667c97a14ded2
Boot ID: bd0d0ba5ba6f4def8386fefd9dc809ed
Virtualization: kvm
Operating System: Ubuntu 21.04
Kernel: Linux 5.11.0-31-generic
Architecture: x86-64
(A DigitalOcean droplet)
