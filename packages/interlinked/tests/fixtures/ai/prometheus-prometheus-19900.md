**What**
- Honor `NaN` clamp bounds for infinite samples.

**Why**
- Clamp functions should return `NaN` for a `NaN` bound, but the current logic can preserve an infinite sample instead.

**Implementation**
- Check for a `NaN` bound before calling `math.Min` or `math.Max`.
- Add regression coverage for the four `NaN`-bound and infinite-sample combinations.

#### Which issue(s) does the PR fix:

None.

#### Release notes for end users (**ALL** commits must be considered).

```release-notes
[BUGFIX] PromQL: Honor NaN clamp bounds for infinite samples.
```