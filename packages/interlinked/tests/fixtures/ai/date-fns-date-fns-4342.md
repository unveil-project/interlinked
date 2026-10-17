Negative sub-hour offsets such as `-00:30` were returned as +30 minutes after the hour component was parsed as `-0`. Select the calculation branch from the original sign so Intl and manual parsing preserve negative offsets, including Monrovia's historical seconds.

Regression tests cover the named-zone result and force the manual fallback for negative minute boundaries and compact inputs, with positive, zero and repeated-call controls.

Related: #4279 and #4314 cover the same sign bug.

Validation: all 189 tz tests, repository type checking and lint pass on Node 24.21.0 and 26.10.0; formatting checks pass for both changed files.
