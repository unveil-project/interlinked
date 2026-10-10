# What does this PR do?

The Megatron-LM guide links to `checkpoint_reshaping_and_interoperability.py` on transformers `main`, but that file was removed in huggingface/transformers 54b89a253d (#47764), so the link 404s.

- `docs/source/usage_guides/megatron_lm.md`: `transformers/blob/main/src/transformers/models/megatron_gpt2/checkpoint_reshaping_and_interoperability.py` -> same path at tag `v5.14.1`, the last release that still has the script.

Docs only; the new target was checked at that tag.

## Before submitting
- [x] This PR fixes a typo or improves the docs (you can dismiss the other checks if that's the case).
- [ ] Did you read the [contributor guideline](https://github.com/huggingface/accelerate/blob/main/CONTRIBUTING.md#submitting-a-pull-request-pr),
      Pull Request section?
- [ ] Was this discussed/approved via a Github issue or the [forum](https://discuss.huggingface.co/)? Please add a link
      to it if that's the case.
- [ ] Did you make sure to update the documentation with your changes? Here are the
      [documentation guidelines](https://github.com/huggingface/accelerate/tree/main/docs), and
      [here are tips on formatting docstrings](https://github.com/huggingface/accelerate/tree/main/docs#writing-documentation---specification).
- [ ] Did you write any new necessary tests?

## Who can review?

Documentation: @SunMarc
