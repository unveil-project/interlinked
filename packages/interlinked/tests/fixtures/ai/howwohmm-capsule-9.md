## Problem
If 100 users enroll in the same playlist, each video's transcript is fetched independently. No deduplication.
- \`worker.py:114-118\` — checks \`db.get_video_transcript(video_id)\` but \`video_id\` is per-user-course, not per-youtube-video
- Same YouTube video across different users = duplicate fetches, duplicate Groq Whisper costs, duplicate YouTube API hits

## Solution
- Add a \`transcripts\` table keyed by \`youtube_id\` (not \`video_id\`)
- Before fetching, check if transcript already exists for this \`youtube_id\`
- Share transcripts across all users who enroll in playlists containing the same video

## Files
- \`db.py\` — add shared transcript table, lookup by \`youtube_id\`
- \`worker.py\` — check shared cache before fetching

## Acceptance Criteria
- [ ] Transcript fetched once per YouTube video, shared across all users
- [ ] Groq Whisper costs not duplicated
- [ ] Existing per-video transcript storage still works as fallback
