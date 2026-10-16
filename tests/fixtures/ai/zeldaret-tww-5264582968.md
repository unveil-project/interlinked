Solid work — clean structure, correct base class, honest member layout. A few notes before merge:

1. Raw SE ids: `mDoAud_seStart(0x6165, …)` and `mDoAud_seStart(0x61B1, …)` — named constants exist: 0x6165 = JA_SE_OBJ_PROP_SW_ON, 0x61B1 = JA_SE_OBJ_KM_WINDMILL (JAZelAudio_SE.h:1694, 1700). We enforce named se ids repo-wide (see #1060 for the same finding).
2. Raw resource indices: `m_bdlidx[] = {3, 3}` — the INDEX enums exist (dRes_INDEX_HPBOT1_BDL_HPBOT1_e, dRes_INDEX_VPBOT_00_BDL_VPBOT_00_e in assets/GZLE01/res/Object/Hpbot1.h + Vpbot_00.h), so dComIfG_getObjectRes should use them.
3. Question: the PR title says 100% but configure.py is untouched (d_a_swpropeller stays NonMatching), so CI builds but never checksums the rel. Is the flip intentionally omitted (e.g. weak ordering) or just not done? Flipping to Matching would let CI verify.
4. Nit: static members m_arcname/m_bdlidx/m_heapsize use the m_ prefix (reserved for instance members) — M_arcname or similar is the usual static style.

(For reference, the HitSeStart 0xB/0x11 raw ids match the merged-actor convention, so no change needed there.)
