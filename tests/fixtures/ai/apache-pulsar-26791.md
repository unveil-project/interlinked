Main Issue: #26786

### Motivation

Pulsar's default Docker image is based on Alpine Linux, whose C library is musl. musl's `malloc` (mallocng) serves every allocation of `MMAP_THRESHOLD` (131,052 bytes) or more with a new `mmap`, and frees it with `munmap`. The chunks that Netty's buffer allocators allocate and free at a steady load are of that size, so every chunk costs system calls. When it is first written, each of its 4 KB pages also costs a page fault. When it is freed, the `munmap` flushes the TLB of every core running a thread of the JVM. See #26786 for the details.

[mimalloc](https://github.com/microsoft/mimalloc) keeps and reuses freed memory, instead of returning each large block to the operating system with `munmap`.

### Modifications

- **A build stage for mimalloc.** A separate stage of `docker/pulsar/Dockerfile` builds mimalloc from its release sources with CMake and Ninja:
  - a release build (`-DCMAKE_BUILD_TYPE=Release`);
  - no secure mode (`-DMI_SECURE=OFF`);
  - no CPU-specific optimizations, so the image runs on any CPU of its architecture (`-DMI_NO_OPT_ARCH=ON`);
  - the musl settings (`-DMI_LIBC_MUSL=ON`);
  - `-D__USE_ISOC11`.
- **Only the shared library goes into the image.** The final image copies just the library, as `/usr/lib/libmimalloc.so.3`, and preloads it before gcompat: `LD_PRELOAD=/usr/lib/libmimalloc.so.3:/lib/libgcompat.so.0`. Setting `LD_PRELOAD=/lib/libgcompat.so.0` restores musl's `malloc`.
- **The version.** The mimalloc version is `mimalloc` in `gradle/libs.versions.toml`, 3.5.3, which the image build passes as the `MIMALLOC_VERSION` build argument; the Dockerfile's default for it is also 3.5.3.
- **The Wolfi image** (`Dockerfile.wolfi`) is unchanged: it uses glibc.

### Verifying this change

- [ ] Make sure that the change passes the CI checks.

**What was checked.**
- The image builds.
- Every JVM of the cluster and the clients maps mimalloc in the performance tests: the brokers, the bookies, ZooKeeper, the gateways and the applications.
- In the IoT telemetry performance scenarios of `tests/performance`, from unbatched 128-byte entries to 128 KB entries, mimalloc lowered the page faults of the Pulsar containers by 90 to 99 %.

**Pending.** More benchmarks are in progress: throughput, latency and CPU, with longer measurements at larger entry sizes. Checks are also running to see whether the page faults are a regression since Pulsar 4.2.x, by comparing Netty's adaptive allocator (#26720) with the pooled allocator, and batch reads enabled and disabled. This description will be updated with the results.

### Does this pull request potentially affect one of the following parts:

<!-- DO NOT REMOVE THIS SECTION. CHECK THE PROPER BOX ONLY. -->

*If the box was checked, please highlight the changes*

- [ ] Dependencies (add or upgrade a dependency)
- [ ] The public API
- [ ] The schema
- [ ] The default values of configurations
- [ ] The threading model
- [ ] The binary protocol
- [ ] The REST endpoints
- [ ] The admin CLI options
- [ ] The metrics
- [x] Anything that affects deployment: the Alpine-based Docker image preloads mimalloc as the processes' `malloc`, in place of musl's.

This change was prepared with the assistance of Claude Code (claude-opus-5-5); I have reviewed and verified it.
