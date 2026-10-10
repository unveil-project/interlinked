 Changes:
<!-- Add here what changes were made in this pull request and if possible provide links showcasing the changes. -->

Hi. I work for Gitpod(an online IDE which is free for Open Source) and we are currently on a mission to simplify contributors onboarding experience for cool and popular Open Source projects. 

This Pr adds Gitpod config to the repo via which, anyone would be able to launch a workspace where it will automatically:

- clone the `p5.js` repo.
- install all the dependencies i.e via running `npm ci`.
- run `npm run grunt` and `npm run dev` in separate terminals.

All of this can be helpful for newcomers/beginners i.e the can start in just a single click without having to set anything up.

You can give it a try on my fork of the repo via the following link:

https://gitpod.io/#https://github.com/nisarhassan12/p5.js

 Screenshots of the change:
<!-- If applicable, add screenshots depicting the changes. -->

![image](https://user-images.githubusercontent.com/46004116/96327123-12933f00-1050-11eb-88a8-ed34c27170f7.png)

#### PR Checklist
<!--
  To check any option, replace the "[ ]" with a "[x]". Be sure to check out how it looks in the Preview tab! Feel free to remove any portion of the template that is not relevant for your issue.
-->

- [x] `npm run lint` passes
- [ ] [Inline documentation] is included / updated
- [ ] [Unit tests] are included / updated

[Inline documentation]: https://github.com/processing/p5.js/blob/main/contributor_docs/inline_documentation.md
[Unit tests]: https://github.com/processing/p5.js/tree/main/contributor_docs#unit-tests
