import {
  defineConfig,
  presetIcons,
  presetWind4,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons({
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
      warn: true,
    }),
  ],
  transformers: [transformerVariantGroup()],
  theme: {
    colors: {
      page: 'var(--bg)',
      panel: 'var(--panel)',
      subtle: 'var(--subtle)',
      fg: 'var(--fg)',
      soft: 'var(--soft)',
      muted: 'var(--muted)',
      line: 'var(--line)',
      hair: 'var(--hair)',
      automation: 'var(--automation)',
      mixed: 'var(--mixed)',
      organic: 'var(--organic)',
      error: 'var(--error)',
      ok: 'var(--ok)',
    },
    font: {
      sans: '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
      display: 'Satoshi, system-ui, -apple-system, sans-serif',
      mono: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace',
    },
  },
  shortcuts: {
    card: 'bg-panel border border-line rounded-10px',
    'card-head':
      'flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 border-b border-line bg-subtle',
  },
})
