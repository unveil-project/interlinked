`NormalCRPScore.metric()` returns `1 / (2 sqrt(pi)) * diag(2, var)`. For the `(loc, log scale)` parametrization the CRPS metric is `2 * integral of grad F grad F^T dy`, which works out to

```
diag(1 / (scale * sqrt(pi)),  scale / (2 sqrt(pi)))  =  1 / (2 sqrt(pi) scale) * diag(2, var)
```

So the current metric is `scale` times too large. The two agree only when `scale = 1`.

A quick check: the CRPS divergence between two normals is `D(p, q) = integral of (F_p - F_q)**2 dy`, and its Hessian in the second argument at `q = p` is the metric. With `loc = 0.3, scale = 2`:

```python
import numpy as np
from scipy import integrate
from scipy.stats import norm
from ngboost.distns import Normal
from ngboost.manifold import manifold
from ngboost.scores import CRPScore

mu, sig = 0.3, 2.0

def div(p):
    f = lambda y: (norm.cdf(y, mu, sig) - norm.cdf(y, p[0], np.exp(p[1]))) ** 2
    return integrate.quad(f, -60, 60, limit=400)[0]

th, h = np.array([mu, np.log(sig)]), 1e-3
H = np.array([[(div(th + a + b) - div(th + a - b) - div(th - a + b) + div(th - a - b)) / (4 * h * h)
               for b in np.eye(2) * h] for a in np.eye(2) * h])
H                                                      # [[0.2821, 0], [0, 0.5642]]
manifold(CRPScore, Normal)(th.reshape(-1, 1)).metric()[0]  # [[0.5642, 0], [0, 1.1284]]
```

A units check points the same way: CRPS has the units of `y`, so the `loc, loc` entry should scale like `1 / scale`, while the current one has no units. For comparison, `LaplaceCRPScore.metric()` (`0.5 / scale`, `0.25 * scale`) and `ExponentialCRPScore.metric()` (`0.5 * scale`) do match this formula.

Since the error is a per-row factor, it changes the natural gradient direction that the base learners fit, not just its size: rows with a large predicted scale get a smaller step than they should. The same expression is used in `NormalFixedMeanCRPScore` and `LogNormalCRPScoreCensored` (there in log space). `NormalFixedVarCRPScore` is unaffected because its scale is 1.

I think the expression came from the NGBoost paper's appendix, so I wanted to ask before changing it. If you agree, I can send a PR that divides these metrics by `scale` and adds a test against the numerical metric.

Checked on master (6aadc1f).
