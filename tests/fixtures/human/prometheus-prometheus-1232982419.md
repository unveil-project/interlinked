Heya, nice, thanks! A couple of comments:

* The Toasted toasts look nice, but since we're already using Bootstrap (via Reactstrap), could we use the Toasts from that to not pull in a new dependency for such a small feature?
* A user currently wouldn't know what clicking on a label does, could we add a `title="Click to copy label matcher"` attribute to the `span`?
* Even with the title, it would be good to visually clarify whether the entire set of matchers is being copied or only one. We could do that by introducing a `:hover` class for the `legen-label-container` and setting something like `background-color: #add6ff; border-radius: 3px; padding-bottom: 1px;` on it: 
![copy-label](https://user-images.githubusercontent.com/538008/187696918-3c5fcc82-7eeb-4366-8275-4e6cd163e6ac.png)

I'm also thinking it would be good to eventually have a way to copy the entire series identifier, or the metric name. Just being able to copy specifically a single label matcher seems a bit arbitrary to me at least. But I'm not sure how to add that UI-wise for the entire series identifier. I guess we'd have to put a little copy icon next to each series, but that adds a lot of clutter, so let's better sleep on that.
