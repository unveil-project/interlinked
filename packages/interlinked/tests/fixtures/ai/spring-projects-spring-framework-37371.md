Closes #36993

When using `@ImportHttpServices` with `detectInBasePackages`, the classpath scanner matched concrete classes that implement an interface annotated with `@HttpExchange` (because `AnnotationTypeFilter` with `considerInterfaces=true` traverses implemented interfaces). Since HTTP Service proxies can only be created for interfaces, this caused failures like `'...' is not an interface` during proxy creation.

This change adds a `metadata.isInterface()` check to `isCandidateComponent` in `HttpExchangeClassPathScanningCandidateComponentProvider`, ensuring that only interfaces are registered as HTTP Service candidates. Explicit `register(...)` calls are unaffected.