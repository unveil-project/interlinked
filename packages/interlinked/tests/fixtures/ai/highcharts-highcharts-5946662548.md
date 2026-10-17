Thanks — this came from a source audit. I have no real application incident or measured production impact to report.

[Runnable demo](https://jsfiddle.net/gh/get/library/pure/OskarEichler/highcharts/tree/38c64fb6f9eb678d3d7ef7d99151ed05ea174494/samples/issues/gh-25129/) · [Immutable source](https://github.com/OskarEichler/highcharts/tree/38c64fb6f9eb678d3d7ef7d99151ed05ea174494/samples/issues/gh-25129). Click JSFiddle’s **Run**, then **Run reproduction**.

Request the same unknown connector twice. Expected: each request rejects. Actual: the first rejects but the second is still pending at the fixture’s 250 ms observation bound. The demo makes no stronger timing claim.

Pinned dependencies: Highcharts 13.1.1 / Dashboards 4.2.3. Verified the actual hosted GitHub import and reproduction button in a browser; the same fixture also reproduced in Chrome at 320 px and 800 px.
