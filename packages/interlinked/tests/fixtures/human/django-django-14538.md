This PR fixes [#27147](https://code.djangoproject.com/ticket/27147).

I could think of two UIs to fix the stated problem:

1. We can add a `default_bounds` as an argument to `RangeField` class, and thus all subclasses. The problem of this approach is that we may add some cutler for discrete ranges. For example, IMO it makes no sense to set a `default_bounds` value for a `IntegerRangeField` as it'll always be converted to `[)`, cluttering user's experience. Please, let me know if I'm missing something.
2. We can specialize `RangeField` for continuous ranges. With this approach we're preventing misuse.

I implemented approach 2.

I'm following a conservative approach for `default_bounds`. For example:

```python
from psycopg2.extras import DateTimeTZRange

lower_date = datetime.date(2014, 1, 1)
upper_date = datetime.date(2014, 2, 2)

class DummyRange(models.Model):
        timestamps = DateTimeRangeField(blank=True, null=True, default_bounds='[]')

DummyRange.objects.create(timestamps=DateTimeTZRange(lower_date, upper_date))  # saved with bounds='[)'
DummyRange.objects.create(timestamps=DateTimeTZRange(lower_date, upper_date, '()'))  # saved with bounds='()'
DummyRange.objects.create(timestamps=(lower_date, upper_date))  # saved with bounds='[]' - default_bounds
```
The reasoning behind is that a user knows what's he's doing if he created a `Range` object (Adding a validator sounds like a good idea). I still need to document whichever behavior we choose.

Looking forward for feedback before finishing this feature.
