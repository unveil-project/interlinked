Throwaway verification PR — **not meant to be merged**. Companion to #39844 (same patch, 5.0.0 side).

4.x has no equivalent `DEPS_VERSION` shortcut yet (no patched-rpm bundle published under the 4.x numbering), so this commits the patched vendored `rpm` source directly under `src/external/rpm/` — the Makefile's own fetch rule skips re-downloading when the directory already exists, so CI builds against this committed copy as-is.

Patch: backport of upstream commit `f85845c26cc8`, fixing CVE-2026-44605 (heap buffer overflow in rpm's NDB backend, reachable via syscollector's package-inventory scan).

Context: internal-devel-requests#6367

Already confirmed independently (local builds, both this host and wazuh-testenv): patch verified present and compiling clean on 4.14.10, both agent and manager (`TARGET=server`). Opening this to see the real CI signal (`4_testcomponent_sysinfo-linux.yml` and friends, which trigger on `src/Makefile`/`src/data_provider/**` changes).

Will close without merging once CI signal is in.
