After doing some testing with NEP-35 in Dask (see https://github.com/dask/dask/pull/6738), I noticed something I grossly overlooked in the original proposal, which is passing the `like=` argument downstream _iff_ supported. The benefit of doing that is to achieve the following:

```python
In [1]: import numpy as np, cupy as cp, dask.array as da

In [2]: np.asarray([1, 2, 3], like=da.array(cp.array(())))
Out[2]: dask.array<array, shape=(3,), dtype=int64, chunksize=(3,), chunktype=cupy.ndarray>
```

Note how passing a Dask array backed by a CuPy array to `like=` will make it possible for Dask to also identify that we want `chunktype=cupy.ndarray`. Without this change, we would only be able to achieve Dask's default, which is `chunktype=np.ndarray`.

This is a change that is unnecessary (or at least I think so) for CuPy, as a CuPy array is purely CuPy-backed, therefore implementing `like=` there would have no value. Due to that, this change will attempt passing `like=` downstream, and if a `TypeError` is raised, then it will fallback to the previous behavior of simply removing `like=` before calling the downstream implementation.

It's also good to point out that such change isn't necessary for Dask internally, we can completely get away without that, as is currently the case in https://github.com/dask/dask/pull/6738 . However, this may be useful for other library developers in the future, so I think it's worth expanding the scope of NEP-35 to allow this. Of course, if we agreed on this change, I will update NEP-35's text to reflect this, but I preferred to have the code functional for some review before doing so.

cc @seberg @rgommers @shoyer @hameerabbasi @quasiben @jakirkham @leofang 