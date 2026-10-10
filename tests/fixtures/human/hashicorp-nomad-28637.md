
## Backport

This PR is auto-generated from #28576 to be assessed for backporting due to the inclusion of the label backport/2.0.x.



The below text is copied from the body of the original PR.

---

The process wrangler creates a parent cgroup within which all task processes run. This allows using the freezer subsystem to ensure all task related processes are killed with no opportunity for escaping.

However this was implemented as a client-global map of tasks and included cleanup operations in the critical section of task shutdown. This effectively serializes all task shutdown *and* startup. Even though cgroup operations are likely a single digit number of syscalls, that's still a significant opportunity for contention on clients with many short-lived tasks.

This commit only serializes task map operations globally, similar to if a sync.Map was used. The actual process wrangling operations are serialized **per-task** by the task runner which only ever calls prestart and stop hooks from TaskRunner.Run.

### Description
<!-- Please describe why you're making this change and point out any important details the reviewers
should be aware of.-->

### Testing & Reproduction steps
<!--
* In the case of bugs, please describe how to reproduce it.
* If any manual tests were done, document the steps and the conditions to reproduce them.
-->

### Links
<!--
Please include links to GitHub issues, documentation, or similar which is relevant to this PR. If
this is a bug fix, please ensure related issues are linked so they will close when this PR is
merged.
-->

### Contributor Checklist
- [ ] **Changelog Entry** If this PR changes user-facing behavior, please generate and add a
  changelog entry using the `make cl` command.
- [ ] **Testing** Please add tests to cover any new functionality or to demonstrate bug fixes and
  ensure regressions will be caught.
- [ ] **Documentation** If the change impacts user-facing functionality such as the CLI, API, UI,
  and job configuration, please update the Nomad product documentation, which is stored in the
  [`web-unified-docs` repo](https://github.com/hashicorp/web-unified-docs/). Refer to the [`web-unified-docs` contributor guide](https://github.com/hashicorp/web-unified-docs/blob/main/CONTRIBUTING.md) for docs guidelines.
  Please also consider whether the change requires notes within the [upgrade
  guide](https://developer.hashicorp.com/nomad/docs/upgrade/upgrade-specific). If you would like help with the docs, tag the `nomad-docs` team in this PR.
- [ ] **LLM Usage** If an LLM was used to generate any code, please ensure and confirm you have read
  and followed the [AI usage guide](../contributing/ai.md).

### Reviewer Checklist
- [x] **Backport Labels** Please add the correct backport labels as described by the internal
  backporting document.
- [x] **Commit Type** Ensure the correct merge method is selected which should be "squash and merge"
  in the majority of situations. The main exceptions are long-lived feature branches or merges where
  history should be preserved.
- [x] **Enterprise PRs** If this is an enterprise only PR, please add any required changelog entry
  within the public repository.


<!-- heimdall_github_prtemplate:grc-pci_dss-2024-01-05 -->

- [x] If a change needs to be reverted, we will roll out an update to the code within 7 days.

## Changes to Security Controls

Are there any changes to security controls (access controls, encryption, logging) in this pull request? If so, explain.


---

<details>
<summary> Overview of commits </summary>

 
  - 345896395c0b471c6f4632fbcd0e4fdecc446d25
 
  - a1c382b19a397b7a94b1d921518766421d2c57f4
 
  - 6eaef8a0a5c81f28190e0e756ed6f956d5380e0f
 
  - 91e9ce97bf2e4b5e9a50dddf0a3505807bbec0d6
 

</details>


