Thanks for the review, and for checking the check digits independently.

1. **Lookup cost**: fixed in 207c8b8. Definitions are now indexed once, keyed by their 8-character base, so a lookup computes one checksum and then does an O(1) dictionary hit.
2. **8 → 9 characters**: this is intended, since it's what #6111 asks for: an 8-character value isn't a valid CUSIP. Lookups by the 8-character base still resolve. I'm happy to add an option for the old 8-character output if you'd like one. Either way it deserves a release note.

**Shared base**: added `ResolvesCUSIPSharedByDefinitionsToTheFirstOne`, which pins that the first definition in file order wins.
