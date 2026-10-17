Invalid regex input in global search currently leaves an empty picker without feedback. Show `Invalid regular expression` in the status line when compiling the query fails, and clear the message when a new query is evaluated, including an empty query.

Buffer-search prompts now show the underlying regex diagnostic in the existing popup, including the pattern location and syntax explanation, instead of `error parsing pattern 0`.

The regressions cover the rendered diagnostic and clearing the global-search error. Valid searches, correction of invalid queries, and empty-query recovery were also checked in a real terminal. Retaining the message when restoring an unchanged picker remains outside this change.

Related to #14611.
