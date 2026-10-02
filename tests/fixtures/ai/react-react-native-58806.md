## Summary:

Reproducer-only RNTester Playground for #58204, #58206, #58210, #58218, #58220, #58222, #58226, #58240 and #58242, following requests for runnable examples. No fixes or internal polyfill imports. These are constructed examples from source-audit findings, not production incidents.

Open RNTester → Playground and press **Run reproducers**. PASS is expected; FAIL identifies reproduced behavior. The NodeList case uses a mounted native View with a child.

## Changelog:

[INTERNAL] [ADDED] - Add public web API issue reproducers to RNTester Playground (reproducer only; not a production change).

## Test Plan:

Verified this exact playground on main cd2de187e8878119896159371225acbb9dfa5d9c using native Hermes/Fabric Fantom: render the playground, dispatch the button's native click, inspect rendered text.

```text
#58204: FAIL (reproduced)
#58206: PASS
#58210: PASS
#58218: FAIL (Error: user slice ran)
#58220: FAIL (reproduced)
#58222: FAIL (Error: user iterator ran)
#58226: FAIL (reproduced)
#58240: FAIL (reproduced)
#58242: FAIL (reproduced)
```

#58206 and #58210 no longer reproduce on this revision. For #58218 ordinary buffer/view aliasing passes, but shadowing `slice` still invokes user code.

Ran `yarn fantom-cli tmp/repro-verification.js` with this local driver (not committed):

```js
import Playground from '../packages/rn-tester/js/examples/Playground/RNTesterPlayground';
const root = Fantom.createRoot();
Fantom.runTask(() => root.render(Playground.render()));
const button = root.document.getElementById('run-reproducers').firstElementChild;
Fantom.dispatchNativeEvent(button, 'click');
console.log(root.document.documentElement.textContent);
Fantom.runTask(() => root.destroy());
```

Also passed targeted Prettier, ESLint with zero warnings, `yarn flow-check` (0 errors), React Doctor on RNTester (100/100; one changed file), and `git diff --check`.

This verifies native Fantom/Hermes, not an iOS/Android device run. Local native build used installed CMake 4.1.2 and disabled a third-party JSON deprecated-literal-operator warning-as-error; no build/environment accommodations are included in this PR.
