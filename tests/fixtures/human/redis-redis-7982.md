Perform full reset of all client connection states, is if the client was
disconnected and re-connected. This affects:

* `MULTI` state
* Watched keys
* `MONITOR` mode
* Pub/Sub subscription
* ACL/Authenticated state
* Client tracking state
* Cluster read-only/asking state
* RESP version
* Selected database
* `CLIENT REPLY` state

The response is +RESET to make it easily distinguishable from other
responses.

Resolves #5571 