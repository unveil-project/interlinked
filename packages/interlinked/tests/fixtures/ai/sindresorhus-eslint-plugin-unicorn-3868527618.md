Thanks for the review! Fixed both issues:

1. Removed Blob and File - you're right, they're not TypedArrays
2. Now importing from `rules/shared/typed-array.js` instead of maintaining a separate list
