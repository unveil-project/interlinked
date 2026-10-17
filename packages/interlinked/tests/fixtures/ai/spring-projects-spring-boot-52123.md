Closes gh-24229

This adds a `PropertySourceLoader` for `.env` files, so that they can be imported with `spring.config.import`:

```yaml
spring:
  config:
    import: "optional:file:.env"
```

Today this fails with "File extension is not known to any PropertySourceLoader", and the usual workaround (`optional:file:.env[.properties]`) works by accident, as discussed in the issue: the `.properties` parser does not understand quoting, `export`, multi-line values or `#` comments after a value.

## What it does

- `DotEnvPropertySourceLoader` handles the extension `env` and is registered in `spring.factories`. Because it is a `PropertySourceLoader`, every existing way to import data works with it: `file:` and `classpath:` locations, the `[encoding=...]` hint, and `env:MY_VARIABLE[.env]` for a `.env` file stored in an environment variable.
- The variables are exposed as a `SystemEnvironmentPropertySource`, so they behave like real environment variables: `SPRING_DATASOURCE_URL=...` sets `spring.datasource.url`, `MY_SOME_KEY` binds to `my.some-key`, and any variable can be used in a `${...}` placeholder. The property source name gets the `-systemEnvironment` suffix, which is what `SpringConfigurationPropertySource` already uses to decide whether to apply the environment variable mapping, so the binder needs no change.
- Config data ranks below real environment variables, so a real variable still overrides the same variable in a `.env` file, which is the usual expectation. An imported `.env` file takes precedence over the file that imports it, like any other imported file.
- Every value keeps a `TextResourceOrigin` with its line and column, so binding errors and the `env` endpoint point at the `.env` file.
- Syntax: `[export ]NAME=value`; blank lines and `#` comments; an unquoted value is trimmed and a `#` after whitespace starts a comment; double quoted values support `\n`, `\r`, `\t`, `\"` and `\\` and can span lines; single quoted values are literal and can span lines; only whitespace or a comment may follow a quoted value; the last duplicate wins; a UTF-8 byte order mark is skipped; `\n`, `\r\n` and `\r` line endings.
- An invalid line fails with the resource and line number, for example `Invalid .env content in file [.env] at line 3: expected 'KEY=VALUE'`. The message never includes the content of the file, because `.env` files usually contain secrets.
- Reference documentation: a new "Importing `.env` Files" section.

## Things I would like your opinion on

The issue is labelled `pending-design-work`, so here are the choices I made, each easy to change:

1. **Environment variable semantics.** I treat the file as environment variables (relaxed names, as above) instead of plain properties. It is what people expect from a `.env` file used with Docker Compose or a shell, and plain `${NAME}` references work either way.
2. **No automatic discovery.** Nothing is loaded unless it is imported, so a stray `.env` in the working directory cannot change the configuration of an application. Loading `.env` by default for development, or from `spring-boot-docker-compose`, could be a follow up.
3. **`application.env` is now also found.** `StandardConfigDataLocationResolver` looks for `application.<extension>` for every registered loader, so `application.env` and `application-{profile}.env` are now loaded from the usual locations, and the AOT resource hints cover them. `checkSpringFactories` requires the entries to be sorted alphabetically, which makes `application.env` take precedence over `application.properties`, which takes precedence over YAML, when they are in the same location (there is a test for it, and the documentation says so). If you would rather not have this, the loader could be registered through a different mechanism, or the order could be made explicit.
4. **No dotenv style expansion.** `${NAME}` placeholders in values are resolved by Spring as in every other property source (quotes only affect how the file is read), so I did not add `${NAME:-default}` expansion.
5. **Fail fast on invalid lines** instead of skipping them silently.

## Testing

Developed test first: the new tests failed against a stub of the loader (47 of 59) and passed with the implementation. Writing a multi-line test also caught a bug in my first version (the first character of the line after an inline comment was swallowed), which is fixed and covered.

- `DotEnvPropertySourceLoaderTests` covers the syntax, escapes, multi-line values, encodings, error reporting (including that messages never contain file content), origins, and environment variable style access and binding.
- `DotEnvConfigDataIntegrationTests` covers importing from the class path and the file system, optional and required locations, placeholders and precedence, origins, `application.env`, and the precedence between `.env`, `.properties` and YAML.
- `SystemEnvironmentConfigDataLocationResolverTests` covers the `env:NAME[.env]` hint.
- `./gradlew :core:spring-boot:check` passes (3915 tests, plus checkstyle, the architecture checks and `checkSpringFactories`), and so do the tests of `spring-boot-devtools` (`DevToolsHomePropertiesPostProcessorTests`) and `spring-boot-properties-migrator`, which also look up property source loaders.
