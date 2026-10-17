### Astro Info

Reproduced against `packages/astro/dist/i18n/fallback.js` built from `main`.

### Describe the Bug

`computeFallbackRoute` swaps the locale with an unanchored `String.replace`, so it rewrites the first substring match rather than the path segment it actually found. Any earlier segment that starts with the locale code gets mangled.

`urlLocale` is picked by exact segment match at `packages/astro/src/i18n/fallback.ts:68-80`:

```js
const segments = pathname.split('/');
const urlLocale = segments.find((segment) => { ... locale === segment ... });
```

but the rewrite at `:111` is a plain replace:

```js
newPathname = pathname.replace(`/${urlLocale}`, `/${pathFallbackLocale}`);
```

So the locale is located correctly and then replaced in the wrong place. Lines 105 and 107 have the same shape.

### Reproduction

Locales `['en', 'es']`, `defaultLocale: 'es'`, `fallback: { en: 'es' }`, `strategy: 'pathname-prefix-always'`, `base: '/'`, `responseStatus: 404`:

```
/en/about           ->  /es/about          correct
/blog/en/x          ->  /blog/es/x         correct
/energy/en/about    ->  /esergy/en/about   wrong
/enterprise/en/x    ->  /esterprise/en/x   wrong
/end/en/x           ->  /esd/en/x          wrong
/engine/en/x        ->  /esgine/en/x       wrong
```

No `base` is needed to trigger it. Any site with an `en` locale and a page under a path starting with `en` sends a 404 fallback redirect to a URL that does not exist.

### Notes

This is the same bug class as #17861, which fixed the build-time route generation in `core/routing/create-manifest.ts`. This is the runtime path, which that change did not reach.

Fix looks like the same shape used there: split on `/`, replace the matching segment, rejoin. Happy to open a PR if that approach is agreeable.

---

Written with AI assistance. The output above is from a run against a local build.
