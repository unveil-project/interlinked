<!-- entire-trail-link-start -->
https://entire.io/gh/jdx/mise/trails/423
<!-- entire-trail-link-end -->

<!-- ccr-projects-attribution: {"github_login":"jdx"} -->
_Requested by **Jeff**_

Stacked on `mise installs migrate`. Closes the two behaviour gaps the identity install layout (jdx/mise#13678) left: backend switches, and versions named on the command line.

**`mise backends switch`.** Before: under the identity layout, the new backend's installation is a different installation from the old backend's, so after switching `hk` from aqua to packslip the version counted as "not installed" and the switch did not reinstall anything. After: the switch installs the new backend's installation of every switched version whose version path exists (the old install or its version link), points the version link at it, and leaves the old backend's installation for prune.

```sh
$ mise backends switch hk
$ mise where hk
~/.local/share/mise/installs/hk-r5n2w6cp      # packslip's installation; aqua's is still there until prune
```

**A version named on the command line.** Before: `mise where tool@1.0` ignored the install options a configuration sets for the tool, while `mise x tool@1.0` and the rest applied them. Outside a project, `where` alone fell back to an installation made with options, and with several it picked whichever the version link named. `which`, `bin-paths`, `x` and `install` treated the version as not installed, a regression from #8888 for `filter_bins`. After:
- In a project, every command, `where` included, applies the configuration's options to a version named on the command line.
- Outside one, a version named without options that has no installation of its own uses the one installation of that version made with other options, in every command, as before the layout. Such a stand-in never becomes the bare request's selection, and `mise install --force tool@1.0` makes the plain variant.
- With several variants, `mise where` lists them and asks for options (`tool[matching=server]@1.0`) instead of guessing.

```sh
$ mise where dummy@2.0.0
mise ERROR dummy@2.0.0 is installed with several sets of options:
  ~/.local/share/mise/installs/dummy-jzljafcj
  ~/.local/share/mise/installs/dummy-pj47cthv
Run this where the configuration that sets them applies, or name them, for example `dummy[option=value]@2.0.0`
```

Not changed, on purpose: the runtime aliases of shared and system installs directories. They are maintained by whoever runs mise for that directory, as before the layout. Nothing here writes into them.

Validation: new `e2e/cli/test_install_layout_switch` (hk aqua → packslip, the new installation and version link, the old one kept) and `e2e/cli/test_install_layout_cli_variants` (a lone variant found by `where`/`bin-paths`/`which`/`x`/`install`, several listed, options naming one, configuration options applied in a project, a forced plain install). The other layout tests and `cli/test_where` pass.

*AI-assisted — Tool: Claude Code; model: anthropic/claude-opus-5-5; version: unavailable.*

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

<sub>Stack created with <a href="https://github.com/github/gh-stack">GitHub Stacks CLI</a> • <a href="https://gh.io/stacks-feedback">Give Feedback 💬</a></sub>

<!-- CURSOR_SUMMARY -->
---

> [!NOTE]
> **Medium Risk**
> Changes core install resolution, allocation, and backend-switch reinstall paths under the experimental identity layout; behavior shifts for multi-variant installs and `mise where` outside projects.
> 
> **Overview**
> Closes two identity install layout gaps: **backend switches** and **bare versions on the CLI**.
> 
> **`mise backends switch`** now treats the new backend as a separate installation. It force-reinstalls switched versions when the old backend’s version path or receipt still exists, repoints the version link, and leaves the prior backend’s tree for `prune`.
> 
> **Bare `tool@version` resolution** is aligned across commands. In a project, `mise where` applies the same config install options as `mise x` (via `apply_config_options_to_runtime_arg`). Outside a project, a sole install with extra options can stand in for the optionless request; several variants produce an explicit error instead of picking the version link. Stand-in installs are **read-only** (no writes, no selection, `always` postinstall allocates a fresh dir). `locate`/`allocate`/`variants_of` use `extends` / `variant_choices` so configured requests never substitute a richer variant.
> 
> Docs in `install-layout.md` describe this; e2e covers switch (hk aqua→packslip) and CLI variant edge cases.
> 
> <sup>Reviewed by [Cursor Bugbot](https://cursor.com/bugbot) for commit 5b5803a9cf3b2722d9b578a4ae90b96936d6324c. Bugbot is set up for automated code reviews on this repo. Configure [here](https://www.cursor.com/dashboard/bugbot).</sup>
<!-- /CURSOR_SUMMARY -->

<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **Bug Fixes**
  * Backend switches with identity install layout now keep the previous installation and point the version link to the new backend’s installation.
  * Outside projects, bare-version requests reuse a sole matching installation, regardless of its install options. If multiple variants exist, `mise where` lists them, while other commands treat the version as uninstalled.
  * Project configuration and explicitly specified options select the matching installation; a different configured variant is not substituted. Forcing an optionless install creates a separate plain-version installation.
* **Documentation**
  * Clarified backend-switching and version lookup behavior with identity install layout.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->