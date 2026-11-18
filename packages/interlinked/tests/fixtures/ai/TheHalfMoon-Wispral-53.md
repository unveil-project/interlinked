## Scope

Execute and qualify only `B2E02`: decode the identical frozen P0 public-human subset with candidate cell 2 (`moonshine-balanced`) under unchanged frozen C0.

## Canonical execution evidence

The canonical evidence source was captured and sealed before the later duplicate execution started; its selection is therefore not result-driven.

- Canonical authority base: `116dbd1734e01ec1280d6b530f0cb1dec867feb1`
- Execution source revision: `43cab310662b6e8eb1ea25b6d8e39a6dbf14a17e`
- GitHub Actions run: `33962004933`
- Job: `101295384896`
- Artifact ID: `9968333519`
- Artifact name: `b2e02-moonshine-balanced-43cab310662b6e8eb1ea25b6d8e39a6dbf14a17e`
- Artifact ZIP SHA-256: `0cb9ae81262a6af0a5eb2382ac1fccdae6488c8a04d8551a912bdf8ff9d818ad`
- Raw evidence SHA-256: `8bc1b3e2e10bd7c64465b424f8dff5ffc84a153868459457d91e22e5cf3da253`
- Evidence payload SHA-256: `ad2baccb196313323b0284d5672f94d9ffae551f0b2af38cc29b4be082e6a6aa`
- Inputs: 240
- Decoded: 240
- Failures: 0

## Duplicate execution reconciliation

A later verifier change matched the temporary capture workflow path filter before that bootstrap workflow was removed, causing a second B2E02 decode execution.

- Duplicate source revision: `76611d5436f1ca6313d5c0832a02e3e7583b0337`
- Run: `33963021322`
- Job: `101298112856`
- Workflow conclusion: `failure`
- Decoder result before that failure: 240 inputs, 240 decoded, 0 failures
- Post-decode failure reason: the hardened verifier correctly rejected the duplicate payload as different from the already sealed canonical payload (`recorded payload digest drift`)
- Artifact ID: `9968588759`
- Artifact ZIP SHA-256: `daa2236bd1bee96a4c241671eefe622d9353c3f5481691aa453640f3f6888c9a`
- Raw evidence SHA-256: `f21cf41533787b3045cf9209b150949ad646d50f702c89640d57c95c47085bc1`
- Payload SHA-256: `601bccfe660db1e3f2b7b1348841c0cfb6152f085c86b9aa2f853e1dce3d0d51`
- Frozen input identity across the two captures: `PASS`
- Decode status identity across all 240 inputs: `PASS`
- Raw transcript identity: `DIFF` for 10 utterances
- Selection effect: `NONE`

The duplicate raw artifact is preserved as noncanonical evidence. The permanent verifier validates both captures, their exact provenance, the 10-transcript nonidentity, and the fact that canonical selection preceded the duplicate run rather than depending on results.

## Preserved boundaries

- frozen P0 membership and preprocessing remain unchanged;
- repository context is OFF;
- test-specific context is OFF;
- candidate-specific audio transforms are OFF;
- raw transcript/failure evidence is preserved;
- reference transcripts were not loaded by the decoder;
- no accuracy scoring or comparative ranking occurred;
- timing remains `DIAGNOSTIC_ONLY`;
- `HUMAN_DEVELOPER_SPEECH_ACCURACY_EVIDENCE=ABSENT`;
- no production STT selection or product-code authority is created;
- `B2E03` and all later cells remain unauthorized until a separate canonical reconciliation after this unit is merged and post-merge verified.

## Final PR tree

The final diff contains only six permanent paths: the B2E02 decoder, verifier, canonical evidence, preserved duplicate evidence, provenance reconciliation, and permanent exact-head evidence workflow. All scaffold, capture, seal, and duplicate-reconciliation bootstrap workflows were removed before final qualification.

## Qualification

Merge is not authorized until all applicable CI is successful on the exact final PR head, a fresh independent substantive semantic review covers that same exact head, all actionable findings and review threads are reconciled, the expected head/base remain unchanged, and guarded expected-head merge requirements are satisfied.

Exact final-head candidate after duplicate reconciliation cleanup: `23818381238b183b3a311b7a9c6319d12b14b9c5`.