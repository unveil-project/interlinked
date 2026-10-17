I measured the MinimizedImageBox line I mentioned, and folded the fix into this
PR after all, because it turned out not to be a separate issue.

Under the array this PR introduces, toID is an item ID. The old line stored the
one bit alpha_is_premultiplied value, and the primary item ID in that path is 1,
so translating it faithfully wrote "item 1 is premultiplied by item 1" into the
new structure. Keeping that seemed worse than fixing it.

The behaviour on main, measured with avifenc on one input image: encoded with
-p it decodes as premultiplied through a regular MetaBox, and as straight alpha
through --mini. Changing only the reader and decoding the same files restores
it, while an image encoded without -p stays unpremultiplied either way.

The parameterized test in avifminitest.cc already compares a MinimizedImageBox
against a regular MetaBox for the same image, and AreImagesEqual compares
alphaPremultiplied. No parameter set marks the alpha as premultiplied, so the
flag was never exercised. The added test does, and it fails without the change.

Happy to split it back out if you would rather review the two separately.
