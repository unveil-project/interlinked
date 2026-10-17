This ensures API routes are not available under the locale path since API routes don't need to be localized and we don't provide the locale to the API in any way currently so the user wouldn't be aware if the localized API route was visited instead of the non-localized. 

Fixes: https://github.com/vercel/next.js/issues/25790

## Bug

- [x] Related issues linked using `fixes #number`
- [x] Integration tests added


