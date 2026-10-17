import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import eslintConfigPrettier from 'eslint-config-prettier'

export default createConfigForNuxt({
  features: {
    typescript: true,
  },
  dirs: {
    src: ['site/app'],
  },
}).append(
  {
    ignores: ['**/dist', '**/.nuxt', '**/.output', '**/.data', '**/corpus'],
  },
  eslintConfigPrettier,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-multiple-template-root': 'off',
      curly: ['error', 'all'],
    },
  },
)
