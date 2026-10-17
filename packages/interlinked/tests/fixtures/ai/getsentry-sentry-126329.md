Replace lodash `cloneDeep` with `structuredClone` in the three EventView URL builders.
`cloneDeep` copies arrays through `array.constructor`, so it throws when `Array.prototype.constructor` has been changed in the tab. `structuredClone` doesn't read that property, and the cloned objects only hold strings and string arrays.

Fixes JAVASCRIPT-3B21 
Refs DAIN-1808
