# What does this PR do?

The current `BlenderbotSmallTokenizer` has an incorrect (probably a typo) value for the `pad_token`. This causes the BlenderBot model to crash on padded sequences (currently pads with a value that exceeds the embedding matrix size).

This PR fixes the behaviour and the tokenizer now pads correctly with `0`.

## Who can review?

 Blenderbot, Bart, Marian, Pegasus: @sshleifer
