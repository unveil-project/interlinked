As of 1.8.1, `htmx.process()` now will inspect a node and, if any attributes have changed, it will re-process them.

See https://github.com/bigskysoftware/htmx/commit/1dbb22b682c625c5054de7127da975f30dfbe6ea

So you can simply modify a node and call `htmx.process()` on it.  This should fix issues with morphing, etc. and so I believe makes this PR obsolete.
