### Brief description of Pull Request

Package init in the CRD manager now calls log.SetLogger with logr.Discard, so unscoped controller-runtime messages are dropped. A component-scoped logger is left out of that global slot because several prometheus.operator components can run together and a reload replaces them, which would attribute those lines to an arbitrary component or lose them when the component stops. Manager and informer errors still go out through the component logger. The added test runs in a separate process, waits 31 seconds, emits root and named logger errors, and checks that the missing-logger warning, stack text, and those messages are absent.

With prometheus.operator.podmonitors, probes, or servicemonitors loaded, the process log prints a controller-runtime stack dump stating that log.SetLogger was never called and that its logs will not be displayed. The dump shows up when those components start their CRD managers, including across a config reload, next to the manager's own failure when the apiserver connection drops. controller-runtime keeps a single process-global logger, and the first log call after a 30 second grace period prints that warning and a goroutine stack when SetLogger has never been called. The shared CRD manager hits that path from runInformers while creating the Kubernetes cache, and no logger had been installed on the global sink before then.

### Pull Request Details

Covered in the summary above.

### Issue(s) fixed by this Pull Request

Fixes #361

### Notes to the Reviewer

Nothing beyond what is described above.

### PR Checklist

- [ ] Documentation added
- [x] Tests updated
- [ ] Config converters updated
- [ ] This pull request was substantially generated with AI assistance (see the [GenAI policy](https://github.com/grafana/alloy/blob/main/docs/developer/genai.md))

AI was used for assistance.
