### Description of changes

Renamed `_footpathErrorOccured` to `_footpathErrorOccurred` in the footpath window, all 17 spots. Also added myself to contributors.md since this is my first one here.

### Rationale behind changes

The flag name was missing an r, I noticed it while reading the footpath code and it bugged me. Nothing game side changes, it is just a private member rename.

### Suggested testing steps

Build the game and open the footpath window, place and remove some paths. Everything should work exaclty like before.

### Did you use AI to help find, test, or implement this issue or feature?

Yes, I used an AI assistant to help spot the typo and check nothing else referenced the old name, then I reviewed the full diff myself before pushing.
