Reapplies #22078 for 0.13.

We store the same HTTP cache information in fewer bytes, without changing cache freshness or revalidation behavior.

- **Booleans become bits.** Ten fields like `no_cache`, `no_store`, and `immutable` each occupied a byte. We pack them into bits of one integer.
- **Optional numbers share their presence flags.** Each archived `Option<u64>` occupies 16 bytes: the number, an indicator of whether it exists, and alignment padding. We store the numbers together and use one bit per number to indicate whether it exists.

For example, `max_age = None` and `max_age = Some(0)` both store the number `0`, but their presence bits differ. Getters reconstruct the normal `Option<u64>`.

We apply this to cache-control directives and response timestamps. The fixed archived policy shrinks from **320 to 200 bytes**. We use `bitflags` for typed flag operations and retain endian-aware integers in the archived representation.

The cache bucket bumps cover the new representation.
