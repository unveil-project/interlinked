### Describe the bug

Before https://github.com/vitest-dev/vitest/pull/1726 I was able to reset my module that I had mocked using `vi.resetModules` in a `beforeEach` handler.

After updating my tests now fail. Looking at the docs I've tried all of the following with none of them letting me reset the mock to its original mock value.

```ts
vi.resetModules();
vi.resetAllMocks();
vi.restoreAllMocks();
vi.clearAllMocks();
```

### Reproduction

https://stackblitz.com/edit/node-vzowau?file=test/basic.test.ts

### System Info

```shell
System:
    OS: Windows 10 10.0.25188
    CPU: (12) x64 Intel(R) Core(TM) i7-8700 CPU @ 3.20GHz
    Memory: 2.65 GB / 15.92 GB
  Binaries:
    Node: 18.3.0 - C:\Program Files\nodejs\node.EXE
    npm: 8.11.0 - C:\Program Files\nodejs\npm.CMD
  Browsers:
    Edge: Spartan (44.25188.1000.0), Chromium (104.0.1293.54)
    Internet Explorer: 11.0.25188.1000
  npmPackages:
    vitest: ^0.22.1 => 0.22.1
```


### Used Package Manager

npm

### Validations

- [X] Follow our [Code of Conduct](https://github.com/vitest-dev/vitest/blob/main/CODE_OF_CONDUCT.md)
- [X] Read the [Contributing Guidelines](https://github.com/vitest-dev/vitest/blob/main/CONTRIBUTING.md).
- [X] Read the [docs](https://vitest.dev/guide/).
- [X] Check that there isn't [already an issue](https://github.com/vitest-dev/vitest/issues) that reports the same bug to avoid creating a duplicate.
- [X] Check that this is a concrete bug. For Q&A open a [GitHub Discussion](https://github.com/vitest-dev/vitest/discussions) or join our [Discord Chat Server](https://chat.vitest.dev).
- [X] The provided reproduction is a [minimal reproducible example](https://stackoverflow.com/help/minimal-reproducible-example) of the bug.
