> Embed version information into the Kernel binary. Gets rid of strange kernel behaviour and establishes one clear path of version information retrieval: uname(1). Is more complicated to implement (I for one have no idea how to incantate objcopy or Linker script for this).

Strong preference for this. I'd say it can be as easy as generating an `.h` file by CMake to be included by the kernel sources, exposing the information as a JSON structure in `/proc` somewhere and make `uname` a userspace-only tool.

> whether we want to use a build hash or a commit hash as the POSIX "version"

Personally, I have never had an interest in comparing two kernel versions by looking at the build output hash. I'm almost always interested in "what was the exact source used to compile this kernel" so I can help people by building that very same commit myself. As for the argument "two different commits can produce the same output binary", I don't see the downside or use case for that.
