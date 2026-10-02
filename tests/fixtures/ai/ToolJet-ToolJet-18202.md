## 📝 What this does

Adds CPF.CNPJ as a marketplace data source, so ToolJet apps can look up Brazilian CPF (individuals) and CNPJ (companies) registration data from Receita Federal without rebuilding the request, the check digit validation and the error handling on top of the REST API data source.

Closes #17901

## 🔀 Changes

- `marketplace/plugins/cpfcnpj/`: new plugin following the AfterShip structure (API key auth, native `fetch`, no runtime dependency besides `@tooljet-marketplace/common`).
  - `lib/manifest.json`: a single encrypted `token` field with a password input.
  - `lib/operations.json`: five operations in a dropdown:
    - CPF: name (package 1)
    - CPF: name, birth date, gender, address (package 3)
    - CNPJ: company name, trade name, address (package 5)
    - CNPJ: full registration, partners (QSA), status, Simples (package 6)
    - Balance: remaining credits of a package (free call)
  - `lib/index.ts`: builds `https://api.cpfcnpj.com.br/{token}/{package}/{document}` with a 60 second timeout through `AbortController`, reads the body as text so an empty error answer still reports its HTTP status, maps both error envelopes the API returns (`{ status: 0, erro, erroCodigo }` and the gateway `{ status: "error", code, message }`) to `QueryError`, and keeps the token out of every error message. `testConnection` calls the free balance endpoint, so it validates the token without spending credits.
  - `lib/validators.ts`: CPF and CNPJ check digit validation, including the alphanumeric CNPJ format. A document with an invalid check digit is rejected before any request is sent, so it never spends a credit.
  - `__tests__/index.js` and `jest.config.js`: 25 Jest tests with `fetch` mocked (validators, URL per operation, both error envelopes, empty and non JSON answers, timeout, token redaction, `testConnection`). The plugin keeps its own `jest.config.js` because the tests load the TypeScript sources through `ts-jest`. Happy to drop it if you prefer another setup.
  - `README.md`: setup, operations and main error codes.
- `server/src/assets/marketplace/plugins.json`: catalog entry for `cpfcnpj`.
- `marketplace/package-lock.json`: workspace link for the new plugin, no new packages.

No changes to the server, the frontend or other plugins. A docs page can follow in a separate PR if you want one.

## 🧪 How to test

The public test token `5ae973d7a997af13f0aaf2bf60e65803` returns fictitious data at no cost for any document with valid check digits, so no account is needed. The API blocks a few minutes after three lookups of the same document in the same package within one minute, so vary the documents while testing.

1. `cd marketplace && npm install && npm run build --workspace=@tooljet-marketplace/cpfcnpj`
2. Start ToolJet with `ENABLE_MARKETPLACE_FEATURE=true` and `ENABLE_MARKETPLACE_DEV_MODE=true`, install CPF.CNPJ from the Marketplace page and create a data source with the token above. Test connection should succeed.
3. Run the operations, for example `CPF: name, birth date, gender, address` with `111.444.777-35`, `CNPJ: full registration` with `11.444.777/0001-61` or the alphanumeric `12.ABC.345/01DE-35`, and `Balance` with package 6.
4. A document with a wrong check digit, such as `11444777000162`, fails with "Invalid CNPJ check digits" and no request is sent.

Checks I ran locally on top of `main` (678fb8f):

- ESLint with the marketplace config and `tsc --noEmit`: clean
- Jest: 25/25 passing (`npx jest -c plugins/cpfcnpj/jest.config.js plugins/cpfcnpj` from `marketplace/`)
- `ncc` build: OK
- `marketplace/scripts/validate-plugin.js` from #18190: PASS
- The built bundle loaded through `runInNewContext` with the same globals `PluginsServiceSelector` provides, calling `testConnection` and all five operations against the live API with the test token: all OK

I exercised the plugin through that same loading path rather than a full ToolJet instance, so step 2 above is the standard marketplace flow and not something I ran end to end.

The `Check New Package Licenses` workflow may flag the new `package.json`; the plugin adds no third party runtime dependency.
