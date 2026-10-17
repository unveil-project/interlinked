This change prevents `PineconeVectorStore.delete(ref_doc_id)` from deleting other documents when its metadata-delete request fails and it enters the prefix-listing fallback. Deleting `doc1` previously selected every vector ID beginning with `doc1`, including nodes belonging to `doc10` and `doc1#revision`. The fallback now verifies each listed vector's `metadata.doc_id` before deleting it.

Fixes #23434

## Why this needs an ownership check

[`add()` at the examined base commit](https://github.com/run-llama/llama_index/blob/6dd2f3cdd9ce7ff927ea8d46ccee08875bb00f95/llama-index-integrations/vector_stores/llama-index-vector-stores-pinecone/llama_index/vector_stores/pinecone/base.py#L297-L350) stores a node with a source relationship under `f"{node.ref_doc_id}#{node.node_id}"`. It also stores the source document ID in metadata. The naming convention is convenient for listing candidates belonging to a document, but it is not an unambiguous encoding of document ownership.

[`delete()` at that commit](https://github.com/run-llama/llama_index/blob/6dd2f3cdd9ce7ff927ea8d46ccee08875bb00f95/llama-index-integrations/vector_stores/llama-index-vector-stores-pinecone/llama_index/vector_stores/pinecone/base.py#L405-L437) initially uses an exact metadata filter. When that request raises an exception, it lists IDs using the raw document ID as the prefix and deletes every listed ID. The exception handler therefore substitutes a broader selection for the original equality condition.

This PR changes the fallback only. It does not assume that every serverless index currently rejects metadata deletion. A successful metadata deletion remains one call to `Index.delete()`, and no list or fetch request is added to that normal path. The defect occurs whenever an exception actually causes execution to enter the existing fallback and the subsequent listing and ID deletion succeed.

Simply adding `#` to the prefix fixes `doc1` versus `doc10`, but leaves `doc1` versus `doc1#revision` unresolved. The insertion API accepts source IDs containing `#`; changing the delimiter or forbidding such IDs would require a separate compatibility decision and would not repair existing stored vectors. This fix uses metadata already written by the integration.

## Implementation

The fallback now processes one listing page at a time:

1. List candidates with `prefix=f"{ref_doc_id}#"` in the configured namespace.
2. Normalize that page to IDs. Older supported SDKs yield strings; Pinecone 9 yields entries with an `id` attribute.
3. Fetch those IDs in the same namespace.
4. Keep only fetched vectors whose metadata has `doc_id == ref_doc_id`.
5. Delete the verified IDs, preserving the existing deletion keyword arguments.

The ownership condition is exact string equality. A missing metadata dictionary, a missing document ID, or metadata identifying another document leaves that vector untouched. No ownership is inferred from the prefix when metadata cannot confirm it. An empty listing page is skipped, and a page with no confirmed matches produces no delete-by-IDs request.

Fetch errors propagate. The code does not catch a failed ownership lookup and then delete the original candidates anyway. Pages already deleted before a later failure are not rolled back; this remains a paginated, non-transactional operation. Processing by page also avoids collecting every listed vector ID in memory or assembling one large delete request.

The ordinary metadata request and every fallback ID deletion continue to receive `delete_kwargs`, including arguments such as `timeout`. Listing and fetching retain the configured namespace. The patch does not alter `add()`, the vector ID format, `delete_nodes()`, or the public method signature.

The package version is bumped from `0.9.0` to `0.9.1` in `pyproject.toml`. The matching editable-package version entry in `uv.lock`, which previously recorded `0.8.1`, is aligned to `0.9.1`. No dependency versions or unrelated lock entries are changed.

## Runnable example of the behavior

This example uses actual insertion and deletion methods with fixed embeddings and an autospecced SDK Index. The first delete call deliberately raises to activate the fallback. There are no Pinecone service calls and no credentials are required.

From the repository root, the local packages can be installed with:

```bash
python -m pip install -e ./llama-index-core -e ./llama-index-integrations/vector_stores/llama-index-vector-stores-pinecone
```

Save the following as `reproduce_pinecone_delete.py` and run it with Python:

```python
from types import SimpleNamespace
from unittest.mock import create_autospec

from pinecone import FetchResponse, Vector
from llama_index.core.schema import (
    NodeRelationship,
    RelatedNodeInfo,
    TextNode,
)
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.vector_stores.pinecone.base import PineconeIndex


def run_case(document_id, entry_pages):
    index = create_autospec(PineconeIndex, instance=True)
    index.upsert.return_value = SimpleNamespace(errors=[])
    store = PineconeVectorStore(
        pinecone_index=index, namespace="documents"
    )
    stored = {}
    documents = [
        document_id,
        document_id + "0",
        document_id + "#revision",
    ]

    # Use the actual add() implementation to create IDs and metadata.
    for owner in documents:
        node = TextNode(
            id_="chunk",
            text=owner,
            embedding=[1.0, 0.0],
            relationships={
                NodeRelationship.SOURCE: RelatedNodeInfo(node_id=owner)
            },
        )
        store.add([node])
        item = index.upsert.call_args.kwargs["vectors"][0]
        stored[item["id"]] = item

    def delete(*, filter=None, ids=None, **kwargs):
        if filter is not None:
            # Deliberately enter the existing fallback.
            raise RuntimeError("Simulated metadata-delete failure")
        for node_id in ids:
            stored.pop(node_id)

    def list_pages(*, prefix, **kwargs):
        # Snapshot the IDs so deleting one page does not change this iterator.
        for node_id in list(stored):
            if node_id.startswith(prefix):
                yield [
                    SimpleNamespace(id=node_id) if entry_pages else node_id
                ]

    def fetch(*, ids, namespace):
        return FetchResponse(
            namespace=namespace,
            vectors={
                node_id: Vector(
                    id=node_id,
                    values=stored[node_id]["values"],
                    metadata=stored[node_id]["metadata"],
                )
                for node_id in ids
            },
        )

    index.delete.side_effect = delete
    index.list.side_effect = list_pages
    index.fetch.side_effect = fetch
    store.delete(document_id, timeout=5)

    actual = sorted(stored)
    expected = sorted(owner + "#chunk" for owner in documents[1:])
    print(
        f"document={document_id!r}, entries={entry_pages}\n"
        f"  actual:   {actual}\n"
        f"  expected: {expected}"
    )
    return actual == expected


results = [
    run_case(document_id, entry_pages)
    for document_id in ("doc1", "doc1#revision")
    for entry_pages in (False, True)
]
assert all(results), "Deleting one document removed other documents"
```

On the prior implementation, the resulting store is empty in each case. With this change, deleting `doc1` retains `doc10#chunk` and `doc1#revision#chunk`. Deleting `doc1#revision` retains the corresponding `doc1#revision0` and `doc1#revision#revision` documents. The final assertion passes for both page formats.

The fetch responses use SDK `FetchResponse` and `Vector` objects rather than a hand-written interpretation of the response interface. Insertion creates both the physical IDs and metadata through `add()`, so the example does not pre-seed an artificial metadata scheme to make the fix work.

## Tests and review boundaries

The Pinecone package tests pass locally: **23 passed**. Ruff 0.11.8 lint and format checks pass for the modified Python files. The runnable example was also checked with Python 3.12.9, Pinecone SDK 9.1.0, and core 0.14.25. Validation uses local SDK objects and mocks, rather than a Pinecone deployment.

The tests cover the behavior most likely to change around this fix:

- Deleting one document preserves ordinary prefix siblings and document IDs containing `#`.
- Both string and entry-object listing formats work over multiple pages.
- Namespace and deletion arguments are retained throughout the relevant calls.
- Successful metadata deletion does not call `list()` or `fetch()`.
- Missing or conflicting ownership metadata does not result in deletion.
- A fetch failure reaches the caller and does not trigger an unverified delete.

The existing page-flattening test is adjusted to expect deletion per verified page. Its assertions still cover preservation of all listed IDs belonging to the requested document; it additionally checks the delimiter-qualified listing prefix.

Only four files are changed: the Pinecone implementation, its existing test module, the package version, and that package's lock entry. There is no new dependency or storage migration.

## Cost and resulting behavior

The exception fallback now makes one fetch request per nonempty list page. That adds latency and whatever read usage the Pinecone service charges for those lookups. The normal metadata-delete path has no additional work. The extra fetch is intentional: the listing result does not contain enough ownership information to distinguish every document ID accepted by the current insertion format.

For vectors written through this integration, `doc_id` is present in the stored metadata, so the fallback can confirm the requested owner. Vectors inserted externally without ownership metadata are left in place instead of being deleted based on their names. If they need to be removed, a caller can use an explicit vector-ID deletion rather than having a document operation guess their owner.

Earlier discussions [#13451](https://github.com/run-llama/llama_index/issues/13451) and [#16819](https://github.com/run-llama/llama_index/issues/16819) explain the deletion-support context. Although a delimiter-qualified prefix appears in that history, it does not resolve document IDs containing `#`. This PR addresses the separate selection error within the current fallback: one document deletion now removes only candidates whose stored document ownership matches the request.

## Contribution details

- New package: no; this modifies an existing package.
- Version bump: The existing integration package is bumped to `0.9.1`, with its editable lock entry aligned.
- Type of change: Bug fix; no public API signature changes.
- Added regression tests: yes; the cases and successful local results are described above.
