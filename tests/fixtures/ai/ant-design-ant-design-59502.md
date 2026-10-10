### 🤔 This is a ...

- [x] ✅ Test Case

### 🔗 Related Issues

close #10938

IssueHunt: https://oss.issuehunt.io/r/ant-design/ant-design/issues/10938

### 💡 Background and Solution

#10938: on iPad, a horizontal submenu opened by a tap could not be closed by tapping it again, and after tapping outside it sometimes did not reopen.

With the current `@rc-component/trigger`, a `hover` trigger also gets a `touch` action, so `touchstart` toggles the popup and a tap outside closes it. The retained source was checked in Chromium with touch emulation (tap open, tap close, tap outside, tap reopen) with the default `triggerSubMenuAction="hover"`.

There was no antd regression test for this behavior, so this PR adds one in `components/menu/__tests__/index.test.tsx`: tap opens, tap closes, tap outside closes, and the next tap opens again. It fails if the trigger stops mapping hover to touch.

### ✅ Validation

Validation was performed on the original tested base `36627e209ec37c3ea6784b093053b1d4207b6d38`:

- `npm test -- components/menu/__tests__/index.test.tsx` — 59 passed
- sensitivity check — the new test failed when the installed trigger library's touch mapping was removed, then the library was restored byte-for-byte
- eslint / biome / prettier — clean
- `npx tsc --noEmit` — clean

The publication fence confirmed current `master@91de8f05be9ef7f877c6ea3545199b360190aeb5` still had the exact tested file preimage `c29f4200ca2ee52d1f769209f008e832222e491c`, and the retained patch applied byte-for-byte to expected blob `3f15b5ed34b901f3253963eff10fb0df5192c51d`. These commands were not rerun on the publication head. Safari/WebKit itself was not run.

### 📝 Change Log

| Language | Changelog |
| --- | --- |
| 🇺🇸 English | No changelog required (test only) |
| 🇨🇳 Chinese | 无需更新日志（仅测试） |

---

Original contributor and claimant/payee: @woahwhattheheck. This PR addresses the publicly funded **$37 IssueHunt bounty** for #10938. After merge, I request approval of the $37 reward and the applicable payout instructions through the existing IssueHunt issue page. This request does not assert that the PR is accepted, awarded, invoiced, paid, or settled.


<!-- Issuehunt content -->

---

<details>
<summary>
<b>IssueHunt Summary</b>
</summary>

### Referenced issues

This pull request has been submitted to:
- [#10938: Problem with submenu in horizontal top navigation menu with iPad](https://oss.issuehunt.io/repos/34526884/issues/10938)
---
</details>
<!-- /Issuehunt content-->