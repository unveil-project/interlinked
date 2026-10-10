Adds the `chunk()` method to fluent strings allowing a string to be "chunked" by a specified length and returning a collection of those chunks.

#### Example Usage

```php
Str::of('foobarbaz')->chunk(3); // Returns collect(['foo', 'bar', 'baz'])
```

This is particularly useful when chaining additional methods.

```php
Str::of('FooBarBaz')->lower()->chunk(3)->implode('-'); // Returns 'foo-bar-baz'
```

I decided to just open a PR instead of starting a discussion first because it was such a minor (non-breaking) change. Totally understand if this is not wanted.