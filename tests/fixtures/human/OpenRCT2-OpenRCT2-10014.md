Regressed by https://github.com/llvm/llvm-project/commit/1d16515fb407 CC @pkubaj to help [freebsd#240629](https://bugs.freebsd.org/bugzilla/show_bug.cgi?id=240629)
```
$ c++ --version
FreeBSD clang version 9.0.0 (tags/RELEASE_900/final 372316) (based on LLVM 9.0.0)
Target: x86_64-unknown-freebsd13.0
Thread model: posix
InstalledDir: /usr/bin
$ c++ -Wl,--version
LLD 9.0.0 (FreeBSD 372316-1300004) (compatible with GNU linkers)

$ git describe --tags --always
v0.2.3-373-gee1282054

$ cmake -GNinja /path/to/OpenRCT2
$ ninja
[...]
ld: error: libopenrct2.a(Network.cpp.o): unable to find library from dependent library specifier: Ws2_32.lib
c++: error: linker command failed with exit code 1 (use -v to see invocation)
ninja: build stopped: subcommand failed.
```
http://package18.nyi.freebsd.org/data/headamd64PR240629-default/2019-09-21_22h04m49s/logs/errors/openrct2-0.2.3_1.log
