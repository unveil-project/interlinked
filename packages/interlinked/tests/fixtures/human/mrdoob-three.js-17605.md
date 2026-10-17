ShapeUtils don't have a `triangulate` method anymore.
It's not part of the [Documentation](https://threejs.org/docs/#api/en/extras/ShapeUtils) and has been [removed from the codebase](https://github.com/mrdoob/three.js/issues/12938). It also does not exist in [`ShapeUtils.js`](https://github.com/mrdoob/three.js/blob/dev/src/extras/ShapeUtils.js)

The holes parameter in the `triangulateShape` method is essentially an array of contours.
That means it is a `Vec2[][]` and not a `Vec2[]`:
https://github.com/mrdoob/three.js/blob/5feb4ba4955376ed05572a90545015a126df9a3a/src/extras/ShapeUtils.js#L32

This pull request solves both problems.