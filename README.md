<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./.github/assets/logo-dark.svg">
    <img src="./.github/assets/logo-light.svg" alt="interlinked logo" width="120">
  </picture>
</p>

<h1 align="center">interlinked</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@unveil/interlinked"><img src="https://img.shields.io/npm/v/@unveil/interlinked?color=8b5cf6" alt="npm version"></a>
  <img src="https://img.shields.io/badge/dependencies-0-339933" alt="Zero dependencies">
  <a href="./packages/interlinked/package.json"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>

Detects AI-agent-written text in pull request descriptions, issues and comments. It reads text the way [AgentScan](https://agentscan.tools) reads accounts, and labels it organic, mixed or automation. Text that's too short to judge gets insufficient data.

No model is involved. The label comes from signals in the text's structure and style, so treat it as a hint, not a verdict.

```sh
pnpm add @unveil/interlinked
```

```ts
import { analyzeText } from '@unveil/interlinked'

const { classification, signals } = analyzeText(pr.body ?? '', {
  // Optional: the repo's PR or issue template, so its headings and
  // checklists don't count against the author.
  template,
})
```

You get the label back, along with the signals behind it. For [grafana/grafana#135600](https://github.com/grafana/grafana/pull/135600):

```js
{
  classification: 'organic',
  signals: [
    {
      id: 'code-span-density',
      description: 'wraps many names in inline `code` spans',
      hits: 2.19,
      contribution: 0.25, // positive leans automation
    },
    {
      id: 'template-checkboxes',
      description: 'has a checkbox list',
      hits: 1,
      contribution: -0.13, // negative leans organic
    },
    {
      id: 'contractions',
      description: "uses contractions (don't, it's, we'll)",
      hits: 3.77,
      contribution: -0.72,
    },
  ],
}
```

## Used by

- [AgentScan Text Action](https://github.com/MatteoGabriele/agentscan-text-action) runs interlinked on every pull request description and labels the ones that read as automated.

## Development

```sh
pnpm install
pnpm dev        # build the library and start the site
pnpm test       # run the library tests
pnpm check      # lint and format
```

## License

[MIT](./packages/interlinked/package.json)
