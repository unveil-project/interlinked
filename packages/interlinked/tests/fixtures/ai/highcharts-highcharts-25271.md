#### Expected behaviour

Treemap and Sunburst hierarchies should accept arbitrary string point and parent IDs, including names inherited from `Object.prototype` such as `toString` and `__proto__`. Distinct IDs should not emit duplicate-ID warnings.

#### Actual behaviour

Hierarchy parent, node, grouping, and Sunburst duplicate-check lookups use ordinary objects. A child referencing a built-in-named parent can crash chart construction with `prev[parent].push is not a function`; after hierarchy construction, Sunburst can also emit false error #31 duplicate warnings for distinct built-in-named IDs.

#### Live demo with steps to reproduce

Create Treemap parent nodes named `toString` and `__proto__`, add one child under each, and enable grouping. The same IDs in a Sunburst should construct without duplicate warnings.

#### Product version

Current main

<!-- ASANA TASK ID (do not delete): 1217966775911017 -->
