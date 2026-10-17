## Summary

Addresses #1942: in `skills/skill-creator/SKILL.md`, the evaluation workflow previously assumed subagents could always be spawned unconditionally at Step 1 (`Spawn all runs (with-skill AND baseline) in the same turn`).

In harnesses like Claude Code or other environments where agent system instructions forbid unrequested subagent spawning, or in environments where subagents are not supported, this assumption caused the documented main path to fail partway through.

### Changes
1. Added an **Environment & Capability Pre-check** at the start of `## Running and evaluating test cases` to check whether subagents can be spawned autonomously.
2. In environments where spawning requires explicit user permission, prompt the user for opt-in (`"I can run N paired test subagents in parallel (with-skill vs. baseline) to evaluate this; would you like me to spawn them?"`).
3. Documented a general **Inline execution fallback** (run test cases sequentially, skip baseline comparisons, collect qualitative feedback).
4. Updated the Claude.ai section to reference this generalized inline execution fallback rather than leaving it isolated to one platform.

Closes #1942.
