Several functions of `felupe.math` have no examples in their docstrings. Add NumPy-style docstrings with a short doctest to each of them. A good template is `math.ddot()` in `src/felupe/math/_tensor.py`.

Tensor functions (`src/felupe/math/_tensor.py`):
- [ ] `dot()`, `dddot()`
- [ ] `transpose()`
- [ ] `eigvals()`, `eigvalsh()`, `svd()`

Field functions (`src/felupe/math/_field.py`):
- [ ] `values()`, `extract()`, `interpolate()`, `norm()`
- [ ] `grad()`, `hess()`
- [ ] `displacement()`, `deformation_gradient()`, `right_cauchy_green_deformation()`
- [ ] `strain()`, `strain_stretch_1d()`

Note that the arrays in FElupe have the tensor axes first, followed by the axes of the quadrature points and of the cells, e.g. a second-order tensor of shape `(3, 3, nquadraturepoints, ncells)`. This may be split into several pull requests, e.g. one per group. Doctests run by `pytest src/felupe/math/_tensor.py` (or `_field.py`).
