Migrates the remaining `gsutil` call sites in `cluster/` scripts to `gcloud storage` equivalents, ahead of gsutil's removal from Google Cloud CLI in March 2027.

Changes:
- `cluster/gce/gci/mounter/stage-upload.sh`: `gsutil cp` → `gcloud storage cp`
- `cluster/gce/util.sh`: prereq check now requires only `gcloud`; `gsutil_get_tar_md5()` → `gcloud_get_tar_md5()` via `gcloud storage hash --hex --skip-crc32c --format="value(md5_hash)"`; `gsutil -m -q -h "Cache-Control:…" cp` → `gcloud storage cp --quiet --cache-control=…`; `gsutil -m acl ch -g all:R` → `gcloud storage objects update --add-acl-grant=entity=AllUsers,role=READER`; `gsutil ls/mb` → `gcloud storage ls` / `gcloud storage buckets create`
- `cluster/get-kube-binaries.sh`, `cluster/get-kube.sh`: `gcloud storage cp` takes the `https://storage.googleapis.com/…` URL directly (no `gs://` rewrite needed); curl/wget fallbacks untouched
- `cluster/log-dump/log-dump.sh`: `gsutil mv/ls` → `gcloud storage mv/ls`

`bash -n` passes on all modified scripts. The `gcloud storage hash` output-format translation (`--format="value(md5_hash)"` preserving the old hex/md5-only semantics) is the one spot I'd appreciate a second pair of eyes on — I couldn't run it against real GCS here.

```release-note
Migrate `gsutil` usages in cluster/ scripts to `gcloud storage` equivalents ahead of gsutil's removal from Google Cloud CLI in March 2027.
```

Fixes #142384.

---
*AI disclosure: this PR was drafted with AI assistance (code migration + PR description). I am responsible for all submitted changes and have reviewed the full diff.*
