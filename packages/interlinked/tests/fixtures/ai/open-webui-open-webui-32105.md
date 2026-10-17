# Pull Request

## Maintainer Request

This PR only updates i18n/localization.

## Checklist

- [x] I have read and I understand the [contribution policy](https://docs.openwebui.com/contributing/#submit-code).
- [x] This PR targets the `dev` branch.
- [ ] This PR links to a well-described, confirmed Issue or active Discussion: `Closes #___` / `Relates to #___`.
- [x] A maintainer explicitly asked me to open this PR, or this PR only updates i18n/localization.
- [x] The change is one logical unit with no unrelated commits.
- [x] I matched nearby code patterns and avoided unnecessary new settings, abstractions, or dependencies.
- [ ] I manually tested the changed workflow and any nearby behavior that could be affected.
- [x] I have not added or rewritten automated tests, fixtures, snapshots, or testing infrastructure unless a maintainer explicitly requested them.
- [x] I updated relevant docs, including the [Open WebUI Docs Repository](https://github.com/open-webui/docs), if needed.
- [ ] I added screenshots for UI changes, and a recording when motion or interaction matters.
- [x] I reviewed any AI-generated code before submitting it.
- [x] The PR title uses one of the prefixes listed below.

## Summary

Bosnian users saw English on the newest screens. 272 of the 3,711 labels and messages in the Bosnian file have no translation on dev. This PR translates all of them. They cover the authenticator sign-in and recovery-code screens, the multi-factor authentication settings, parent groups and inherited members, voice calls with the voice avatar and gesture editor, model controls in chat, the file comparison view, the sharing mode for shared chats and folders, the default prompt suggestions, and a few single labels such as the Tavily search depth and the build version.

The new strings follow the terms the Bosnian file already uses: "Prijava" and "Odjava" for signing in and out, "razgovor" for chat, "Vještine" for Skills, "Alati" for Tools, "Admin ploča" for the Admin Panel, and "npr." for "e.g.". Buttons use the singular imperative ("Kreiraj vještinu"), and instructions address the user formally ("Unesite kod za oporavak"), as the existing file does. "Open WebUI", "OpenAI Realtime" and parameter names such as `top_k` and `temperature` stay as written.

## Verification

- Every key was checked against the component that shows it, so short labels read right where they appear. For example, "Inherited" in the group members filter reads "Naslijeđeno", in the same form as the "Direktno" option beside it.
- The `_one`, `_few` and `_other` plural forms are filled with the Bosnian forms for each count ("1 dodan red", "2 dodana reda", "5 dodanih redova").
- Every `{{placeholder}}`, line break, ellipsis and ending punctuation matches the English.
- Only empty values changed: 272 lines, with key order unchanged and no existing translation edited.
- `prettier --check` passes on the file.

I did not view the new strings in a running instance.

## Changelog Entry

### Added

-

### Changed

- Bosnian translations filled in for the 272 labels and messages that had none.

### Fixed

-

### Removed

-

### Security

-

### Breaking Changes

-

## Additional Context

The key "Open" serves both as a verb (opening a file in the file browser or terminal output) and as a visibility level beside "Private" and "Public" in the access control menu. Bosnian needs different words for the two ("Otvori" and "Otvoreno"), so this PR uses the verb, which covers two of the three places. The visibility option needs its own key in the code.

A few strings in the voice avatar editor and the model controls ("Idle", "Default orb", "Custom avatar", "Upload VRM", "Slider" and others) reach `$i18n.t` through a ternary, which `i18n:parse` does not extract. They are in no locale file, so they show in English in every language.

## Contributor License Agreement

<!--
DO NOT DELETE THIS SECTION.
Your PR will not be reviewed or merged until you check the box below confirming that you have read and agree to the CLA.
-->

- [x] By submitting this pull request, I confirm that I have read and fully agree to the [Contributor License Agreement (CLA)](https://github.com/open-webui/open-webui/blob/main/CONTRIBUTOR_LICENSE_AGREEMENT), and I am providing my contributions under its terms.
