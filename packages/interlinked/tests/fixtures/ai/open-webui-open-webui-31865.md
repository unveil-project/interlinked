# Pull Request

## Maintainer Request

Closes #31654 — https://github.com/open-webui/open-webui/issues/31654 (filed 2026-09-30; no maintainer reply yet).

## Checklist

- [ ] I have read and I understand the [contribution policy](https://docs.openwebui.com/contributing/#submit-code).
- [x] This PR targets the `dev` branch.
- [ ] This PR links to a well-described, confirmed Issue or active Discussion: `Closes #31654`.
- [ ] A maintainer explicitly asked me to open this PR, or this PR only updates i18n/localization.
- [x] The change is one logical unit with no unrelated commits.
- [x] I matched nearby code patterns and avoided unnecessary new settings, abstractions, or dependencies.
- [x] I manually tested the changed workflow and any nearby behavior that could be affected.
- [x] I have not added or rewritten automated tests, fixtures, snapshots, or testing infrastructure unless a maintainer explicitly requested them.
- [x] I updated relevant docs, including the [Open WebUI Docs Repository](https://github.com/open-webui/docs), if needed. *(the docs' install hint should read `valkey-glide-sync>=2.5.2` — happy to follow up there)*
- [x] I added screenshots for UI changes, and a recording when motion or interaction matters. *(n/a — no UI change)*
- [x] I reviewed any AI-generated code before submitting it.
- [x] The PR title uses one of the prefixes listed below.

## Summary

The Valkey vector store's two GLIDE clients (query and batch-write) now set `client_info_tag='open-webui'`. GLIDE appends it to the library name it already sends through `CLIENT SETINFO LIB-NAME`, so the server sees `GlidePySync(open-webui)` instead of a bare `GlidePySync`. That lets whoever runs the Valkey server tell Open WebUI's connections apart from any other GLIDE user.

`client_info_tag` first appears in `valkey-glide-sync` 2.5.2, so the optional pin mentioned in `pyproject.toml`, `backend/requirements.txt` and the ImportError hint moves from `==2.3.1` to `>=2.5.2`. Since the dependency is still commented out and not in `uv.lock`, the lockfile doesn't change.

The existing `client_name` values are untouched. `CLIENT SETNAME` and `CLIENT SETINFO LIB-NAME` are separate fields.

## Verification

Built the real `ValkeyClient` from this branch (with `VALKEY_URL=valkey://127.0.0.1:6390`) against Valkey 9.1.1 standalone, kept it open, and checked the server:

```
$ valkey-cli -p 6390 CLIENT LIST LIB-NAME 'GlidePySync(open-webui)'
id=236 name=open_webui_vector_store_client       lib-name=GlidePySync(open-webui)
id=237 name=open_webui_vector_store_batch_client lib-name=GlidePySync(open-webui)
```

Both clients carry the tag. The backend only has a standalone path, so cluster mode doesn't apply. I didn't exercise the full app stack.

## Changelog Entry

### Added

-

### Changed

- Valkey vector store connections now identify as `GlidePySync(open-webui)` via `CLIENT SETINFO LIB-NAME`; recommended `valkey-glide-sync` is now `>=2.5.2`.

### Fixed

-

### Removed

-

### Security

-

### Breaking Changes

- None. Metadata only; on `valkey-glide-sync` < 2.5.2 the Valkey backend would fail at config construction, hence the raised floor.

## Additional Context

Nothing changes in behaviour. This only adds connection metadata.

## Contributor License Agreement

<!--
DO NOT DELETE THIS SECTION.
Your PR will not be reviewed or merged until you check the box below confirming that you have read and agree to the CLA.
-->

- [ ] By submitting this pull request, I confirm that I have read and fully agree to the [Contributor License Agreement (CLA)](https://github.com/open-webui/open-webui/blob/main/CONTRIBUTOR_LICENSE_AGREEMENT), and I am providing my contributions under its terms.
