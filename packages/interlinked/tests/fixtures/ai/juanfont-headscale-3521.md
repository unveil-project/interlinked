New registrations commit a seed DNS name before collision and fallback handling, so headscale restarts can restore duplicate or empty names. Resolve and persist the final name in the serialized node-store creation path, committing node creation and single-use key consumption before publishing the node. Failed creation leaves the node unpublished and the key available for retry.

> Generated with the help of an AI assistant
