Removes GRPC_XDS_ENDPOINT_HASH_KEY_BACKWARD_COMPAT and GRPC_EXPERIMENTAL_RING_HASH_SET_REQUEST_HASH_KEY. Both defaults were flipped in #8922, so this deletes the variables along with the conditional code paths and test toggles.

Partially fixes #5888.

RELEASE NOTES: none
