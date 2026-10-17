Normally, rustdoc will resolve `//!` docs in the scope inside the module
and `///` in the scope of the parent. But if there are modules with
inner docs, it would previously resolve _all_ of the links inside the module.

This now distinguishes between links that came from inside the module
and links that came from outside. The intra-doc links part works, but
unfortunately the rest of rustdoc assumes there is only one canonical
resolution for a link and won't look for more than one on the same item.

- Store the attribute style on each DocFragment
- Don't combine attributes with different styles
- Calculate the parent module in only one place
- Remove outdated and fixed FIXME comments

This came from a failed attempt to work on https://github.com/rust-lang/rust/issues/78591 and there's some debugging for that left over. Let me know if I should remove it.

r? @GuillaumeGomez - do you have suggestions for how to pass this information to the rest of rustdoc? For context, the issue is that given a list of links like
```rust
vec![ItemLink { link: "a", did: Some(DefId(0)) }, ItemLink { link: "a", did: Some(DefId(1)) }]
```
`rustdoc::html` will always pick the first resolution in the array. Maybe the link should also say whether it's an inner or outer link, and have `html` distinguish too?

cc @Manishearth - technically this is a breaking change, but I consider the old behavior a bug.