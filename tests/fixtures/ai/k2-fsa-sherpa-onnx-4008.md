`sherpa-onnx-cli text2token` keeps the extra items of each input line and appends them to the encoded tokens: the boosting score `:x`, the threshold `#x` and the original phrase `@x`. However, `text2token()` silently drops any text it cannot encode, e.g. a token missing from `tokens.txt`, or a word not in the lexicon for `phone+ppinyin`. `encode_text` still pairs `encoded_texts[i]` with `extra_info[i]`, so every line after a skipped one is written with the extra info of the previous line.

Example (`--tokens-type cjkchar`, where tokens.txt contains only 你 好 世 界):

input:

    你好 :2.0 #0.6 @你好
    再见 :3.0 @再见
    世界 #0.3 @世界

output before:

    你 好 :2.0 #0.6 @你好
    世 界 :3.0 @再见

output after:

    你 好 :2.0 #0.6 @你好
    世 界 #0.3 @世界

Changes:
- Move the body of `text2token()` into a private `_text2token()` that returns `None` for a text that cannot be encoded, so its result stays aligned with the input. The public `text2token()` filters the `None`s out, so its behaviour is unchanged.
- `encode_text` uses `_text2token()` and skips the `None` entries when writing the output.
- Add `test_cli_keeps_extra_info_of_each_line` to `sherpa-onnx/python/tests/test_text2token.py`. It uses synthetic files, so no test data is needed, and it is skipped if `click` is not installed. It fails before the change and passes after it.

Tested with the released 1.13.8 wheel with the changed files overlaid: `python sherpa-onnx/python/tests/test_text2token.py -v`, plus flake8 on the changed files.


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Bug Fixes**
  * Text-to-token conversion now skips input lines that cannot be encoded instead of producing unusable output. Successfully encoded lines retain their associated extra fields.
  * The text conversion utility continues to return its established output for encodable inputs.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->