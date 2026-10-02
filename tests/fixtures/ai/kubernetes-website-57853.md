French translation of the Network Policies page.

I kept the English heading anchors, as in the other French networking pages. The YAML samples are not duplicated, the page uses the English ones like ingress.md does.

I checked the examples on a kind cluster : the single `from` element with `namespaceSelector` and `podSelector` only lets the `role=client` pods of the `user=alice` namespace through, the two elements version also lets in the other pods of that namespace and the `role=client` pods of the local namespace, and the default deny egress policy blocks DNS as said in the caution.

Translated with AI assistance, reviewed by me (native French speaker).
