Currently, the copy phase of vreplication has only one knob to limit its performance impact:
`-vreplication_copy_phase_duration`.  This allows adjusting the maximum duration a single consistent snapshot of the source table will run for.

However, if migrating data, upstream systems where MoveTables are running from can be very busy (high write rate), and even if the copy phase duration is limited, a lot of undo records can be accumulated because of the consistent snapshot.

One additional way to limit the snapshot impact would be to structure the copy as explicit ranges of the primary key, instead of the current (paraphrased):
```
SELECT * from table1 where pk > xxxx;
```
something like:
```
SELECT * from table1 where pk > xxxx and pk < yyyy;
```

This way, no undo records would need to accumulate during most of the copy, if the table is like most, and the writes are towards the end of the primary key range.

Obviously, implementing this is somewhat non-trivial:
  * Need to sample or make assumptions about the PK distribution
  * Need to estimate appropriate ranges (not too small, not too big)
  * Need to keep track of this information (unless we re-estimate every time the stream starts;  may be reasonable)

One simplifying solution may be to only support this "optimized impact" type copy for tables with integer PKs.
