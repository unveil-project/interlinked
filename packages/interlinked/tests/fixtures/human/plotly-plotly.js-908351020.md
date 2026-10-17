Thanks for the report & beautiful demo.
Prior to v2.3.0 `scattergl` ignored `plotGlPixelRatio` setting which was a bug.
Now you could get similar performance by setting `plotGlPixelRatio: 1` in the `config` i.e. in the last argument.
