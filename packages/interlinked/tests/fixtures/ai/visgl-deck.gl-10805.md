Replace general-purpose CARTO basemaps in examples and documentation so they no longer depend on CARTO's basemap licensing. Keep CARTO-specific examples on CARTO and preserve existing non-CARTO data and imagery sources.

Changes:
- Use OpenFreeMap styles in standalone, gallery, playground, website, basemap-browser, and pydeck examples, plus matching documentation snippets.
- Replace the website's CARTO-backed light/dark style assets with label-free OpenFreeMap styles and update interleaving layer IDs for the new styles.
- Use OpenFreeMap TileJSON in generic MVT demos.
- Replace the CARTO raster texture in the Python terrain-extension example with NASA Blue Marble. Cap its terrain tile zoom at 8 to match the imagery service.
- Retain CARTO basemaps in CARTO-specific examples and leave existing OSM, Mapbox, Google, ArcGIS, and HERE sources intact.

Validation:
- `yarn lint` passed.
- `yarn test-website` passed, including the package build, website production build, documentation output validation, and scripting gallery build.
- Changed Python/notebook syntax and JSON parsing checks passed.
- MapLibre style validation, label-layer ID checks, and replacement endpoint checks passed.
- `git diff --check` passed.

The website build emitted unrelated HTML nesting, broken-anchor, component, and deprecation warnings. NASA Blue Marble provides lower-resolution terrain imagery than the replaced CARTO texture and supports native zoom levels 0–8.

<!-- CURSOR_SUMMARY -->
---

> [!NOTE]
> **Low Risk**
> Documentation and example URL changes only; no core rendering logic, with CARTO-specific demos left on CARTO.
> 
> **Overview**
> Swaps **general-purpose demo basemaps** from CARTO to **[OpenFreeMap](https://openfreemap.org/)** so examples and docs no longer rely on CARTO’s basemap licensing. Most `mapStyle` / `map_style` values now point at `https://tiles.openfreemap.org/styles/{positron,dark}`, and pydeck samples explicitly use `map_provider="maplibre"`.
> 
> **MVT** snippets and website demos load vector tiles from `https://tiles.openfreemap.org/planet` instead of CARTO MVT URLs. **Interleaved MapLibre** examples update `beforeId` from CARTO layer ids (e.g. `watername_ocean`) to OpenFreeMap label layers (mostly `waterway_line_label`).
> 
> The **site defaults** import local `deck-light` / `deck-dark` JSON for label-free styles and use OpenFreeMap for labeled variants. The **terrain extension** pydeck example switches terrain texture from CARTO raster to **NASA Blue Marble** with `max_zoom=8`. **CARTO-specific** content (e.g. the CARTO SQL example) keeps CARTO basemaps; Mapbox and other third-party tile sources are unchanged.
> 
> <sup>Reviewed by [Cursor Bugbot](https://cursor.com/bugbot) for commit 6a598fdb87f05a0f7354bb274c5a8bd513a4bde9. Bugbot is set up for automated code reviews on this repo. Configure [here](https://www.cursor.com/dashboard/bugbot).</sup>
<!-- /CURSOR_SUMMARY -->