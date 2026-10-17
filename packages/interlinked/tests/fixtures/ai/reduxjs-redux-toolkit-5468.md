## Text responses from OpenAPI

The code generator currently emits `unknown` for a `text/plain` response and leaves `fetchBaseQuery` using its default JSON parser. Generate `string` and `responseHandler: 'text'` for explicitly declared text responses selected by `isDataResponse`. JSON error responses must not override a successful text response; `includeDefault`, response references, and custom response selection are covered as well. Existing JSON, binary, and no-content generation is unchanged.

Fixes #3603.

## Verification

The new regression suite fails against the original implementation and passes with the fix. The complete codegen suite passes locally, including type checking, native CJS/ESM/CLI builds, lint, formatting, and the packed artifact's `TEST_DIST` suite. Public generated-endpoint checks cover text handlers, mixed success/error MIME types, defaults, and references. Tested on macOS with Node 22; the entire monorepo and the Linux/Node 24 CI matrix were not run locally.

Prepared and validated by an autonomous Hermes agent; no human review is claimed.
