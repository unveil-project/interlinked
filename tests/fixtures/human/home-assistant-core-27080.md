## Description:

Cleanup the `run_callback_threadsafe` and use that from asyncio/CPython with own guard without a function frame in the middle. We don't use that function anyway not many times since we full rewritten the core to async.