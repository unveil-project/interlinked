import { defineConfig, presetWind4, transformerVariantGroup } from 'unocss'

export default defineConfig({
  presets: [presetWind4()],
  transformers: [transformerVariantGroup()],
  theme: {
    colors: {
      page: 'var(--bg)',
      fg: 'var(--fg)',
      muted: 'var(--muted)',
      line: 'var(--line)',
      field: 'var(--field)',
      agent: 'var(--agent)',
      human: 'var(--human)',
    },
    font: {
      sans: 'system-ui, -apple-system, sans-serif',
      mono: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace',
    },
  },
  shortcuts: {
    field:
      'block w-full h-280px p-4 border border-line rounded-10px bg-field font-mono text-13px leading-[1.6] resize-none outline-none [field-sizing:content] transition-colors duration-150 focus:border-muted',
  },
})
