### Feature hasn't been suggested before

- [x] I have verified this feature I'm about to request hasn't been suggested before.

### Describe the enhancement you want to request

Add a focused DaoXE provider guide to the Kilo Code documentation.

DaoXE is already present in the live `models.dev` catalog as provider `daoxe`, using `DAOXE_API_KEY`, `@ai-sdk/openai-compatible`, and `https://daoxe.com/v1`. Kilo refreshes that catalog automatically, so no provider implementation is required. Users can already configure DaoXE, but there is no provider page showing where to create a key, how to select the provider in VS Code, or how to configure the CLI with an account-available model ID.

The guide should:

- Document the existing VS Code provider flow and CLI `DAOXE_API_KEY` configuration.
- Tell users to choose an exact model ID available to their account instead of hard-coding a catalog snapshot.
- Describe Kilo's current OpenAI-compatible path accurately while noting that DaoXE also exposes other protocols outside this integration.
- Link the public examples and disclose that the contributor is affiliated with DaoXE.
- State that DaoXE is not available in mainland China.

This is a documentation-only change under `packages/kilo-docs` with navigation and provider-index entries.
