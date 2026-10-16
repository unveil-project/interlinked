### Describe the bug

When running Vite on Windows WSL (Linux), the following error appears:

`error: The working directory "/path/to" is not an absolute path`

This happens with any path.

### Reproduction

- Open Windows WSL
- Run vite

### System Info

```shell
System:
    OS: Linux 4.4 Ubuntu 20.04.3 LTS (Focal Fossa)
    CPU: (8) x64 11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz
    Memory: 19.38 GB / 31.71 GB
    Container: Yes
    Shell: 5.0.17 - /bin/bash
  Binaries:
    Node: 16.8.0 - /usr/bin/node
    Yarn: 1.22.10 - /mnt/c/Users/ecapp/AppData/Roaming/npm/yarn
    npm: 7.21.0 - /usr/bin/npm
```


### Used Package Manager

yarn

### Logs

```shell
> error: The working directory "/path/to" is not an absolute path

failed to load config from /path/to/vite.config.js
error when starting dev server:
Error: Build failed with 1 error:
error: The working directory "/path/to" is not an absolute path
    at failureErrorWithLog (/path/to/node_modules/esbuild/lib/main.js:1449:15)
    at /path/to/node_modules/esbuild/lib/main.js:1131:28
    at runOnEndCallbacks (/path/to/node_modules/esbuild/lib/main.js:921:63)
    at buildResponseToResult (/path/to/node_modules/esbuild/lib/main.js:1129:7)
    at /path/to/node_modules/esbuild/lib/main.js:1236:14
    at /path/to/node_modules/esbuild/lib/main.js:609:9
    at handleIncomingPacket (/path/to/node_modules/esbuild/lib/main.js:706:9)
    at Socket.readFromStdout (/path/to/node_modules/esbuild/lib/main.js:576:7)
    at Socket.emit (node:events:394:28)
    at Socket.emit (node:domain:475:12)
error Command failed with exit code 1.
```


### Validations

- [X] Follow our [Code of Conduct](https://github.com/vitejs/vite/blob/main/CODE_OF_CONDUCT.md)
- [X] Read the [Contributing Guidelines](https://github.com/vitejs/vite/blob/main/CONTRIBUTING.md).
- [X] Read the [docs](https://vitejs.dev/guide).
- [X] Check that there isn't [already an issue](https://github.com/vitejs/vite/issues) that reports the same bug to avoid creating a duplicate.
- [X] Make sure this is a Vite issue and not a framework-specific issue. For example, if it's a Vue SFC related bug, it should likely be reported to https://github.com/vuejs/vue-next instead.
- [X] Check that this is a concrete bug. For Q&A open a [GitHub Discussion](https://github.com/vitejs/vite/discussions) or join our [Discord Chat Server](https://chat.vitejs.dev/).
- [X] The provided reproduction is a [minimal reproducible example](https://stackoverflow.com/help/minimal-reproducible-example) of the bug.
