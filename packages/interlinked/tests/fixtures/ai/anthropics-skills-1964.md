## Summary

Addresses #1953 in `skills/pptx/scripts/clean.py`:

Previously, `clean.py` extracted slide relationship IDs from `ppt/presentation.xml` using a regex:
```python
re.findall(r'<p:sldId[^>]*r:id="([^"]+)"', pres_content)
```
If `presentation.xml` was missing, malformed, used single-quoted XML attributes (`r:id='rId1'`), or used an alternative namespace prefix (`<ppt:sldId>`), the regex returned no IDs. The safety guard then failed to trigger, causing `remove_orphaned_slides()` to delete **every** slide on disk and all associated resources (charts, drawings, media).

## Changes

1. **Robust XML Parsing**: Replaced regex extraction with `defusedxml.minidom` (already utilized throughout `clean.py`) to parse `sldId` elements and resolve `r:id` across namespaces and quotation styles.
2. **Fail-Closed Safety**:
   - Refuses to clean (`RefusedToClean`) if `ppt/presentation.xml` is missing while slides exist on disk.
   - Refuses to clean (`RefusedToClean`) if `ppt/presentation.xml` is malformed and fails to parse.
   - Refuses to clean (`RefusedToClean`) if no on-disk slides match the referenced slides list.
3. **Regression Tests**: Added `skills/pptx/tests/test_clean.py` covering missing/malformed `presentation.xml`, single-quoted attributes, alternative namespace prefixes, and mismatch detection.

Fixes #1953
