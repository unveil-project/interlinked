The grammar fetch mechanism downloads and compiles grammar files from remote git repositories without signature verification or integrity checks. The build_tree_sitter_library function compiles C/C++ code from fetched grammar sources. If an attacker compromises a grammar repository or performs a MITM attack, malicious code can be injected into the grammar compilation process, leading to arbitrary code execution during the build phase. The affected code is `helix-loader/src/grammar.rs:389`. This change is the fix I would apply.

Reference: [CWE-426](https://cwe.mitre.org/data/definitions/426.html)

## What changed
- `helix-loader/src/grammar.rs`

## Verification
No automated check could be run against this repository, so this change is unverified beyond review. Please treat it as a suggestion.

---
*Automated security fix by [OrbisAI Security](https://orbisappsec.com)*

<!-- orbis-meta: rule=multi_agent.cwe-426 scanner=multi_agent_ai cwe=CWE-426 -->
