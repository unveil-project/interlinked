Short answer: evo doesn't convert raw GPS/IMU data (the `oxts` folder) into a trajectory — it only reads/evaluates trajectories that already exist in a supported format. The `oxts` data is the raw sensor stream, not a pose trajectory.

What you need is a **pose trajectory** (one SE(3) pose per timestamp). evo's `kitti` format is exactly that: 12 numbers per line, the 3×4 transformation matrix written row-major (R | t), which is the ground-truth format of the KITTI odometry benchmark.

For the KITTI Raw dataset specifically:

1. The ground-truth poses are **not** in `oxts`. They are distributed with the KITTI **odometry** benchmark downloads as `poses/XX.txt` (one file per sequence, in KITTI pose format). Use those:
   ```
   evo_traj kitti poses/00.txt --save_as_tum
   ```
   (`--save_as_tum` writes a TUM-format file.)

2. If you want poses derived from `oxts` (GPS/IMU), you have to convert them yourself first — e.g. with the KITTI devkit (`convertOxtsToPose` in `pykitti`/`devkit_odometry`) or `pykitti`'s `load_oxts_packets_and_poses`. evo intentionally doesn't do GPS→pose integration.

3. Alternatively, run a SLAM/VO pipeline on the raw data and export its estimated trajectory as TUM (or KITTI) for evaluation.

The fields you listed (lat/lon/alt/roll/pitch/yaw/vn/ve/…) are exactly the raw OXTS output — they're the input to a pose computation, not poses themselves.

So: feed evo a pose file (KITTI `poses/` or a converted TUM), not the `oxts` folder.
