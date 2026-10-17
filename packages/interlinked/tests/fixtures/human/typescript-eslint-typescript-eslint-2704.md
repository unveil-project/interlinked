fix #2582

This PR only adds support for banning the empty tuple type `[]`, it does not change the default options of the `ban-types` rule. 

I think it might also be worth adding `[]` to the default banned types. As this would be a breaking change, I would do it in another PR, if the maintainers are ok with that.