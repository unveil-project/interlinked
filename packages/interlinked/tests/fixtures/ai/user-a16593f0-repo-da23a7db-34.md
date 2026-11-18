## Goal
Improve search usability when users type transliterated names with or without diacritics.

## Scope
- Normalize the search query and searchable text consistently before matching.
- Preserve the original display text.
- Add tests for case differences and representative diacritic variants.

## Acceptance criteria
- Search remains case-insensitive.
- Matching does not rewrite the displayed Arabic or transliterated names.
- The change is isolated to search behavior.