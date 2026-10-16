`find_duplicates` uses the largest distance in the first column of the kNN graph as its threshold (`duplicate_distance = np.max(knn_dists.T[0])`). That assumes every point is its own nearest neighbour at the same distance as an exact duplicate, which doesn't hold for float or int8 input.

```python
import numpy as np
from sklearn.datasets import make_blobs
from evoc.knn_graph import knn_graph
from evoc.clustering_utilities import find_duplicates

X, _ = make_blobs(600, n_features=32, centers=5, random_state=0)
Xd = np.vstack([X, X[:20]])          # rows 600-619 are exact copies of rows 0-19
expected = {(i, 600 + i) for i in range(20)}

inds, dists = knn_graph(Xd.astype(np.float32), n_neighbors=15, random_state=0)
d = find_duplicates(inds, dists)
print(len(d), len(expected & d))     # 12 12

Xi = np.clip(Xd * 10, -127, 127).astype(np.int8)
inds, dists = knn_graph(Xi, n_neighbors=15, random_state=0)
d = find_duplicates(inds, dists)
print(len(d), len(expected & d))     # 8448 12
```

Float32: the self distances are all 0, so the threshold is 0. Some copies come out at about `1.7e-07` (for example row 0 vs row 600) because the dot product of a row with its copy isn't exactly the same as with itself after rounding. Those pairs are missed, so 8 of the 20 copies aren't reported.

Int8: with the `1 / dot` distance a point is usually not its own first neighbour (that was true for only about 4% of rows here), and the first-column distances vary per point. The threshold ends up larger than most neighbour distances, so 8448 pairs are reported for 620 points.

This is with the current main branch on Windows, Python 3.11.7, numpy 2.4.6, numba 0.68.0. Possible fixes would be a small tolerance for the float case, and either a per-point threshold or an exact row comparison of the candidate pairs for int8. I'm happy to open a PR if you have a preference.
