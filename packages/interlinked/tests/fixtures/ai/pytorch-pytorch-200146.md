Stack from [ghstack](https://github.com/ezyang/ghstack/tree/0.15.0) (oldest at bottom):
* #200435
* #200349
* __->__ #200146
* #200143
* #200176
* #200140
* #200139
* #199942
* #200144
* #200129
* #200128
* #200134
* #200127
* #191798
* #190248
* #199785
* #199784
* #199565
* #200130
* #200136
* #200345

create_graph_input's debug log formatted the example value's full repr; log
its class name and shape instead. run_node's error message formats repr(args)
and repr(kwargs); if that raises, the original exception was lost, so fall
back to argument counts.

Test Plan:

```
python -m py_compile <touched files>
lintrunner <touched files>
```

Authored with an AI assistant.