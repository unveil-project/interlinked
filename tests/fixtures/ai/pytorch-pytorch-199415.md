## Supported by

Supported by @yushangdi

## BC-breaking?

> No public API changes. The fixes correct displayed memory peaks, summary geometry, and annotation text.

## Summary (human written only)

this PR fixes edge case bugs related to details


## Agent details (if applicable)

> AI-generated details, authored with Codex. The Summary above is taken from
> the author's request.
>
> This PR fixes four edge case bugs related to MemoryViz's Detail setting:
> lowering Detail could underreport the peak and clip the plot, summarized
> allocations could be misplaced or disappear at the end, and changing Detail
> could repeat recorded annotations. The fixes keep the peak independent of
> Detail, align the summary band with the timeline, and preserve annotations
> across redraws. Initial private-pool summaries also follow their envelopes
> after reservation growth, keeping each summary inside the correct pool.
>
> Review the four commits in the order shown below.
>
> The examples use real CUDA tensor operations and save `_snapshot()` directly.
> They ran on a B200 with PyTorch `2.15.0.dev20260928+cu130` and the native
> allocator. Run each example in a fresh process with the following setup.
>
> ```python
> import pickle
> from pathlib import Path
> import torch
>
> OUTPUT = Path("memoryviz-detail-repros")
> MIB = 1024**2
>
> def start_history():
>     torch.cuda.memory._record_memory_history(
>         stacks="python", max_entries=10000, clear_history=True
>     )
>
> def save_snapshot(name):
>     snapshot = torch.cuda.memory._snapshot()
>     OUTPUT.mkdir(parents=True, exist_ok=True)
>     with (OUTPUT / f"{name}.pickle").open("wb") as output:
>         pickle.dump(snapshot, output, protocol=4)
>     return snapshot
>
> torch.cuda.memory._set_allocator_settings("expandable_segments:False")
> warmup = torch.ones(1, device="cuda")
> warmup.add_(1)
> torch.cuda.synchronize()
> del warmup
> torch.cuda.empty_cache()
> ```
>
> 1. **`204bae1` - Preserve peak memory across Detail settings.**
>
>    ```python
>    start_history()
>    x = torch.ones(512, device="cuda")
>    y = torch.ones(256, device="cuda")
>    del y
>    del x
>    torch.cuda.synchronize()
>    save_snapshot("01-peak")
>    ```
>
>    Allocate 2 KiB and 1 KiB with `torch.ones`, then delete both tensors. At
>    Detail = 1, the smaller allocation is summarized. That path skipped the peak
>    update, so the visualizer reported 2 KiB instead of 3 KiB and clipped the plot.
>
>    Update the peak whenever `advance()` samples a memory state, including
>    summarized and initially present allocations. The reported peak becomes
>    3 KiB. The tests also cover a trace that starts by freeing a preexisting
>    allocation, which previously could report a zero peak.
>
>    View: Active Memory Timeline; Detail = 1.
>
>    <img width="3810" height="2336" alt="image" src="https://github.com/user-attachments/assets/16f0da03-31b4-40fb-8249-72d5e4ca8962" />
>
> 2. **`4dabf9d` - Align the global summary with the timeline.**
>
>    Keep 512-byte, 2 KiB, and 256-byte tensors alive while saving the snapshot.
>    At Detail = 1, the small tensors form a 768-byte summary above the 2 KiB tensor.
>    An extra initial offset shifted the summary to an earlier height, and a
>    missing final endpoint hid the last interval.
>
>    Initialize the summary arrays together and append the final endpoint. The
>    summary stays above the drawn tensor and continues to the end of the trace,
>    including when every allocation is summarized.
>
>    ```python
>    def summary():
>        start_history()
>        x = torch.ones(128, device="cuda")
>        y = torch.ones(512, device="cuda")
>        z = torch.ones(64, device="cuda")
>        torch.cuda.synchronize()
>        return save_snapshot("02-summary")
>
>    summary()
>    ```
>
>    View: Active Memory Timeline; Detail = 1.
>
>    <img width="3810" height="2336" alt="image" src="https://github.com/user-attachments/assets/2965f050-3d17-451d-a92e-4d2425986210" />
>
> 3. **`f6cae8b` - Keep annotations stable across redraws.**
>
>    Allocate one CUDA tensor and call `_annotate_tensor` once. Rendering the
>    same loaded snapshot again appended the recorded annotation to the original
>    event again, so three renders displayed three copies of the annotation.
>
>    Copy each allocation event and its annotation array before replaying the
>    trace. The annotation appears once after each render, while separate recorded
>    annotations and existing metadata remain intact.
>
>    ```python
>    def annotations():
>        start_history()
>        x = torch.ones(128, device="cuda")
>        torch.cuda.memory._annotate_tensor(x, "saved for backward")
>        torch.cuda.synchronize()
>        return save_snapshot("03-annotations")
>
>    annotations()
>    ```
>
>    View: Active Memory Timeline; Detail = 1. Move Detail from 1 to 0 and back to 1
>    without reloading, then hover over the tensor. The capture harness performs
>    three renders of the same loaded snapshot.
>
>    <img width="3810" height="2336" alt="image" src="https://github.com/user-attachments/assets/9907e327-7681-4204-b66c-03ff4166057d" />
>
> 4. **`cd09042` - Move initial pool summaries with their envelopes.**
>
>    Allocate 4 MiB and 2 MiB in pool A, and 512 KiB in pool B, before recording.
>    In this run the allocator reserves 20 MiB for A and 2 MiB for B. An 8 MiB
>    default-pool tensor takes the individually drawn slot at Detail = 1.
>
>    After initial reservation growth, B's envelope begins at 20 MiB, but its
>    512 KiB summary still begins at 6 MiB, inside A's envelope. Reposition the
>    initial summaries after reservations are known. B's summary moves to 20 MiB
>    inside its own envelope. The peak remains 30 MiB in both versions.
>
>    The code already had a subsequent correction loop for individually drawn
>    stripes in `p.block_stack`, but it omitted `p.summarized_data`. Consequently,
>    the summary retained its old coordinates.
>
>    The commit adds these lines to the correction loop after all initial
>    reservation growth:
>
>    ```javascript
>    if (p.summarized_data) {
>      p.summarized_data.offsets.fill(env_offset + p.drawn_active);
>    }
>    ```
>
>    Here, `env_offset` is the envelope's final bottom position, and
>    `p.drawn_active` is the combined height of its individually drawn allocations.
>    Adding them places the summary directly above those allocations, inside
>    the correct envelope.
>
>    ```python
>    def pool_summary():
>        pool_a = torch.cuda.MemPool()
>        pool_b = torch.cuda.MemPool()
>        with torch.cuda.use_mem_pool(pool_a):
>            a = torch.ones(4 * MIB, dtype=torch.uint8, device="cuda")
>            b = torch.ones(2 * MIB, dtype=torch.uint8, device="cuda")
>        with torch.cuda.use_mem_pool(pool_b):
>            c = torch.ones(MIB // 2, dtype=torch.uint8, device="cuda")
>        torch.cuda.synchronize()
>        start_history()
>        x = torch.ones(8 * MIB, dtype=torch.uint8, device="cuda")
>        del x
>        torch.cuda.synchronize()
>        return save_snapshot("05-pool-summary")
>
>    pool_summary()
>    ```
>
>    View: Allocated Memory (incl. Private Pools); Detail = 1.
>
>    <img width="3810" height="2336" alt="image" src="https://github.com/user-attachments/assets/04eb74af-7bd3-4762-9a60-d7db16083cd5" />
>
> **Validation**
>
> The final branch passes 251 JavaScript assertions. `lintrunner -a` passed
> before each of the four commits. The four saved native CUDA pickles also
> pass independent peak/final-byte and coordinate checks in all three timeline
> views at Detail 0, 1, and 15000: 36 combinations.
>
> ```bash
> node test/profiler/test_memory_viz.js
> source .venv/bin/activate
> lintrunner -a
> ```
