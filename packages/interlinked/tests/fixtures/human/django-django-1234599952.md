You're right that it makes no difference with the current set of properties and their Hebrew translations, and further, it's a little hard to come up with a likely example where it would, here.

In general, the addition changes `dir` from the inherired `rtl` (or `ltr`) to `auto`; this would matter if the property names were affected by directionality. For example, if instead of `salt` it were called `salt+`, without the `dir="auto"` it would look like this
![image](https://user-images.githubusercontent.com/129187/187979160-db130a8e-b29f-4088-b111-9a9cbd6bd822.png)
and with it, it would be correct:
![image](https://user-images.githubusercontent.com/129187/187979387-82d15da0-8142-41b1-bc67-bb372e80d710.png)

but this may very well turn out to be a YAGNI. 
