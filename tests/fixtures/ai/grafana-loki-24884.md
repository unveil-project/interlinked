**What this PR does / why we need it**:

The `ip()` filter scans a line for runs of address characters and parses each run. `.` and `:` are address characters, so when an address is directly followed by a period or (for IPv6) a colon, that punctuation becomes part of the run, the parse fails, and the address is skipped. So `|= ip("192.168.1.0/24")` misses `accepted from 192.168.1.10.` and `|= ip("2001:db8::/32")` misses `peer 2001:db8::1: reset`. Worse, `!= ip(...)` keeps those lines even though they contain an excluded address.

This changes `filterFn` so that when a run does not parse and ends in `.` or `:`, it drops one trailing byte at a time and tries again. It goes one byte at a time so that addresses ending in `::` (like `2001:db8::.`) still parse correctly. Lines that already matched take exactly the same path as before, and the scan position is unchanged.

Tests:
- two new table cases in `Test_IPFilter` (IPv4 and IPv6, with negatives like `192.168.0.11.` and `1.2.3.`)
- an end-to-end scenario in `line_filters.logqltest` covering both `|=` and `!=`
- a new `Benchmark_IPFilter_Adversarial` with lines full of non-address dotted/colon runs ending in separators

**Which issue(s) this PR fixes**:
Fixes #24879

**Special notes for your reviewer**:

Benchmarks (`go test -tags=assert -run xxx -bench Benchmark_IPFilter -benchmem -count=6 ./pkg/logql/log/`):

| benchmark | main | this PR |
|---|---|---|
| Benchmark_IPFilter (3 patterns) | 32 B/op, 3 allocs/op | 32 B/op, 3 allocs/op |
| Benchmark_IPFilter_Adversarial (3 patterns) | 816 B/op, 29 allocs/op | 1488 B/op, 43 allocs/op |

Timing (Apple M4, benchstat over 6 runs): the normal benchmark is flat (1.81/1.84/1.64 µs/op on main vs 1.81/1.83/1.66 µs/op with this PR, no significant difference). The adversarial benchmark shows a real slowdown of about 30% (≈1.15 µs/op → ≈1.51 µs/op, +30-32%, p=0.002), which tracks the extra allocations below.

The normal path is unchanged. In the adversarial case each retry costs one extra allocation, because `netip.ParseAddr` allocates an error when it fails. The span is converted to a string only once, so the retries themselves don't add conversions. I also tried a version that retries only once with all trailing punctuation removed. It allocates less, but it gives different results on inputs like `::1.::`, so I kept the simpler loop.

Not addressed here, but noticed while testing: an address glued to preceding hex text with a colon (`ad:fe80::1`) and IPv4-mapped IPv6 addresses against an IPv4 CIDR still don't match. Happy to open separate issues if those are considered bugs.

**Checklist**
- [x] Reviewed the [`CONTRIBUTING.md`](https://github.com/grafana/loki/blob/main/CONTRIBUTING.md) guide (**required**)
- [ ] Documentation added (not needed; the documented behaviour is already what this implements)
- [x] Tests updated
- [x] Title matches the required conventional commits format, see [here](https://www.conventionalcommits.org/en/v1.0.0/)
- [ ] Changes that require user attention or interaction to upgrade are documented in `docs/sources/setup/upgrade/_index.md` (none)
- [ ] If the change is deprecating or removing a configuration option, update the `deprecated-config.yaml` and `deleted-config.yaml` files respectively in the `tools/deprecated-config-checker` directory. (n/a)

I used an AI assistant to help find this and draft the fix; I reviewed and tested the change myself.
