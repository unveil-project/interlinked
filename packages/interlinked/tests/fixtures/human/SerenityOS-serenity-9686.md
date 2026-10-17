For example: `RegExp("\0|a").exec("a")` should return `["a"]` but instead returns `[""]`. Changing `\0` to `\1`, for example, produces the correct result.

This affects jQuery 3.4.1:
```js
	// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",
// ...snip...
	pseudos = ":(" + identifier + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",
// ...snip...
	rpseudo = new RegExp( pseudos ),
```

Error:
```
    :((?:\\.|[\w-]|[^-\xa0])+)(?:\((('((?:\\.|[^\\'])*)'|"((?:\\.|[^\\"])*)")|((?:\\.|[^\\()[\]]|\[[\x20\t\r\n\f]*((?:\\.|[\w-]|[^-\xa0])+)(?:[\x20\t\r\n\f]*([*^$|!~]?=)[\x20\t\r\n\f]*(?:'((?:\\.|[^\\'])*)'|"((?:\\.|[^\\"])*)"|((?:\\.|[\w-]|[^-\xa0])+))|)[\x20\t\r\n\f]*\])*)|.*)\)|)
                     ^---- [ ] imbalance.
```

From: https://code.jquery.com/jquery-3.4.1.js lines 591-619.
