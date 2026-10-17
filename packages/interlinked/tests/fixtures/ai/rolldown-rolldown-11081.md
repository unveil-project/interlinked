Related to #11057

The module loader waits for one message from every module task. A task that panicked sent nothing, so the build never finished and never reported an error.

A panic in a module task is now turned into a build error that carries the panic message.
