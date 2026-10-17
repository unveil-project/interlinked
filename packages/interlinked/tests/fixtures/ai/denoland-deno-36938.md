Deno Deploy accepts two `deploy` keys that the config schema doesn't
list, so editors flag them as unknown (`deploy` and `deploy.runtime`
set `additionalProperties: false`):

* `deploy.buildTimeout`: a whole number of seconds, or a whole number
  with an `s`, `m` or `h` suffix (e.g. `"10m"`)
* `deploy.runtime.memoryLimit`: runtime memory limit in megabytes, plus
  its deprecated snake_case alias `memory_limit`
