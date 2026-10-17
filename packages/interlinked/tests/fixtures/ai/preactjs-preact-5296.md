Fixes #3666

A rerender that is queued before the previous commit's `useEffect`s have run now runs them first, as React does. Radix registers Slider thumbs in an effect and reads them in the rerender that a ref callback queues, so before this change the thumbs never got an index and stayed hidden.

Builds on #5265 (its two commits are included here): an effect error now throws out of the flush before anything renders, and the queue is rescheduled instead of dropped, so neither the effect error nor a later render error is lost.

The flush happens in core, through a private `options._flushEffects` hook that `process()` calls before draining the queue. #5163 tried to get the same behaviour by wrapping `options.debounceRendering` from `preact/hooks`, which had these problems:

- Any later assignment to that public option silently dropped the flush, so behaviour depended on import order and on whoever set a scheduler last.
- `setupRerender()`/`act` replaced the wrapper, so tests ran with different effect timing than apps, and test-utils needed patches.
- +39 B brotli on hooks alone.

Here `process()` runs on every path, including custom schedulers and `act`. Only effects of finished commits that kept their tree are flushed early:

- A commit's effects become flushable after its layout effects have run, so a synchronous rerender during a commit (`flushSync` in a ref or layout effect, a sync `debounceRendering`) still runs layout effects first.
- After a render that caught an error or suspended, effects wait for the frame as before, because the boundary's rerender discards part of that tree. Siblings of a thrower under an error boundary or a suspending `lazy()` don't mount and unmount their effects.
- Pending effects are taken before they run, so an effect that throws, or calls `flushSync`, doesn't run twice.

Cost: core +6 B (including #5265) and hooks +36 B brotli.

Verified with `@radix-ui/react-slider@1.4.5`: on 11.0.0 both thumbs sit at 0% with no `aria-valuenow`; with this branch they render at 25% and 75% and keyboard changes move them.

> [!NOTE]
> Verified by GPT6.1-sol
