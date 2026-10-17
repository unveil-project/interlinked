## Summary

The FFmpeg fallback already returns audio at `fs`, but `load_audio_text_image_video` retains the source `audio_fs` and resamples the decoded waveform again. Forcing the fallback on a generated one-second, 48 kHz WAV with `fs=16000, audio_fs=48000` produces 5,334 samples on the base commit instead of 16,000. This change returns the expected 16,000 samples.

- Record `audio_fs = fs` after a successful FFmpeg fallback.
- Pass a separate `input_sr` for raw `.pcm` files so their source rate is preserved; direct helper calls still default `input_sr` to `sr`. Container source rates still come from their headers.
- Add regression coverage for container paths/bytes/BytesIO, consumed-stream rewind, decoder controls, and raw PCM rates. Simply adding `audio_fs = fs` without the PCM input-rate change fails five of the six raw-PCM controls.

## Type of change

- [x] Bug fix
- [ ] Documentation
- [ ] Example or demo
- [ ] Runtime or deployment
- [ ] Benchmark or evaluation
- [ ] Model/training change

## Validation

- [x] `python -m compileall funasr examples tests`
- [ ] Docs or links checked (not applicable)
- [ ] Runtime/deployment command tested (not applicable)

The existing CPU CI test selection was run locally with NumPy 1.26.4 and 2.4.0. Each run: **238 passed, 6 skipped, 10 subtests passed**. The six skips are real torchaudio decoder controls requiring optional `torchcodec`, which the CI environment does not install.

```sh
OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 NUMBA_NUM_THREADS=1 HF_HUB_OFFLINE=1 python -m pytest -q \
  tests/test_numpy_compatibility.py tests/test_numpy_cluster_compatibility.py \
  tests/test_eend_feature_compatibility.py tests/test_pypi_metadata.py \
  tests/test_sensevoice_word_timestamps.py tests/test_pcm_input_format.py \
  tests/test_load_audio_bytes.py tests/test_timestamp_tools.py \
  tests/test_punc_model_none.py tests/test_paraformer_hotword_file.py tests/test_cli.py
```

With optional `torchcodec==0.10.0` installed, `python -m pytest -q tests/test_load_audio_bytes.py tests/test_pcm_input_format.py -k 'ffmpeg or normal_decoders'` passed all **64 tests, with no skips**, including real first-decoder controls. The complete two-file suite in that environment returned **146 passed, 1 failed**: `TestLoadAudioBytes::test_decodes_big_endian_rifx_wav`. That endian-decoding failure reproduces identically on untouched base `e7e61293d308f4342ab9307895e710e4b51b949c`.

`pip check`, the changed audio-byte test file's Black check, and `git diff --check` passed.

## User impact

Preserves audio duration and sample rate when normal decoders fall back to FFmpeg, while retaining raw-PCM source-rate behavior.

## Notes for reviewers

This is the earlier audio-loader fallback boundary, separate from the speaker-boundary resampling addressed in #3763. No GPU, model weights, or acoustic-quality evaluation was used. Hosted CI also passed both NumPy matrix jobs on `1d5fd87d933118198075f358dddc7644bc063b42`: [NumPy 1.26.4](https://github.com/modelscope/FunASR/actions/runs/37797582319/job/113380945339?pr=3767) and [NumPy 2.4.0](https://github.com/modelscope/FunASR/actions/runs/37797582319/job/113380945789?pr=3767).
