## Problem
A markdown file whose front matter closing `---` is the last thing in the file (no trailing newline) is not stripped, so the YAML is rendered as a horizontal rule plus text.

## Cause
`yamlPattern` required `---` to be followed by a newline, so the closing marker at EOF never matched.

## Fix
Also accept end of input after the marker.

## Testing
Added `TestRemoveFrontmatter`; the EOF cases fail before and pass after. `go test ./...` passes.