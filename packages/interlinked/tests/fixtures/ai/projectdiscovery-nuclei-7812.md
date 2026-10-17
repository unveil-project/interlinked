## Proposed changes

A two-field request line omits the path, so the second field is the version. The branch that supports it tested the field by substring:

```go
parts := strings.Fields(s)
if len(parts) > 0 {
    rawRequest.Method = parts[0]
    if len(parts) == 2 && strings.Contains(parts[1], "HTTP") {
        // When relative path is missing/ not specified it is considered that
        // request is meant to be untampered at path
        // Ex: GET HTTP/1.1
        parts = []string{parts[0], "", parts[1]}
    }
```

Any path containing `HTTP` matches that test, so the field is taken as the version and the path becomes `""`:

```
GET /HTTPProxy          ->  Method=GET  Path=""
GET /api/HTTPHandler    ->  Method=GET  Path=""
GET /admin              ->  Method=GET  Path="/admin"
GET HTTP/1.1            ->  Method=GET  Path=""      (correct, this is the case the branch is for)
```

The match is case-sensitive, so it needs the path to carry `HTTP` in capitals, which is ordinary in paths like `/HTTPProxy`, `/HTTPRequest.php` or `/api/HTTPHandler`.

There are two symptoms, depending on the template.

For a normal raw template the path is silently replaced, so `Parse` falls through to `rawrequest.Path == ""` and uses the input URL's path. The request goes somewhere the template did not ask for and nothing reports it, which for a scanner means a quiet false negative.

For a self-contained template the failure is louder but misleading. `ParseRawRequest` refuses an empty path:

```go
if req.Path == "" {
    return nil, errkit.New("path cannot be empty in self contained request")
}
```

so the template is rejected with "path cannot be empty" while the path is plainly present in the request line.

## Fix

Test the field for a version token rather than for a substring:

```go
if len(parts) == 2 && strings.HasPrefix(parts[1], "HTTP/") {
```

`HTTP/1.1`, `HTTP/1.0`, `HTTP/2` and `HTTP/0.9` all keep working, and a path can no longer be mistaken for one. The sibling raw parser in `pkg/input/types/http.go` already works this way: it requires three fields and uses a prefix test rather than a substring test when deciding what a field is.

## Verification

`TestParseRawRequestVersionlessRequestLine` covers both paths that contain `HTTP` and the versionless case the branch exists for. Against the current code it fails:

```
--- FAIL: TestParseRawRequestVersionlessRequestLine
    Error: Expected nil, but got: path cannot be empty in self contained request
```

With the change the package is 36 tests and no failures:

```
go test -count=1 ./pkg/protocols/http/raw/     # ok, 36 tests
go vet ./pkg/protocols/http/raw/
gofmt -l pkg/protocols/http/raw/               # no output
```

The versionless case is asserted through `readRawRequest` rather than `ParseRawRequest`, since the latter is for self-contained templates and correctly rejects an empty path, so it is not the layer where that behaviour lives.

## Checklist

- [x] Pull request is created against the [dev](https://github.com/projectdiscovery/nuclei/tree/dev) branch
- [x] All checks passed (lint, unit/integration/regression tests etc.) with my changes
- [x] I have added tests that prove my fix is effective or that my feature works
- [ ] I have added necessary documentation (if appropriate)


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Bug Fixes**
  * Request paths containing `HTTP` are now preserved when parsing raw requests. Requests with a method and HTTP version but no path continue to be parsed with an empty path.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->