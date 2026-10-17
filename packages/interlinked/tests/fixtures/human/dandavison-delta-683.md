Noticed it a few times already on different files but this time creating actual issue. Not really sure what triggers it but doing `delta <file1> <file2>` makes delta hang sometimes.

Reproducer with comparing configure.ac files from SDL 2.0.14 and 2.0.16:
```
wget https://raw.githubusercontent.com/libsdl-org/SDL/release-2.0.14/configure.ac -O configure1
wget https://raw.githubusercontent.com/libsdl-org/SDL/release-2.0.16/configure.ac -O configure2
delta configure1 configure2
```

After this delta shows nothing and hangs.
