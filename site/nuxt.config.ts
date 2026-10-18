// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@unocss/nuxt', '@nuxt/eslint', '@nuxt/fonts', 'nuxt-og-image'],

  // On Netlify the URL comes from its `URL` variable; elsewhere set
  // NUXT_PUBLIC_SITE_URL, so the OG image URL is absolute.
  site: { name: 'agentscan · text' },

  // Fonts load here rather than from stylesheet links, so the OG image
  // renderer can use them too.
  fonts: {
    families: [
      {
        name: 'IBM Plex Sans',
        provider: 'google',
        weights: [400, 500, 600],
        global: true,
      },
      {
        name: 'IBM Plex Mono',
        provider: 'google',
        weights: [400, 500],
        global: true,
      },
      {
        name: 'Satoshi',
        provider: 'fontshare',
        weights: [500, 700],
        global: true,
      },
    ],
  },

  css: ['~/assets/css/main.css'],

  // The analysis page renders on request, so a shared link's preview image
  // can show which pull request, issue or comment it is.
  routeRules: { '/': { prerender: true } },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'agentscan · text',
      meta: [
        {
          name: 'description',
          content:
            'Checks pull requests, issues and comments against a human baseline for signs of AI-generated text.',
        },
      ],
      link: [
        {
          rel: 'icon',
          href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6' fill='%23ff5b1f'/%3E%3C/svg%3E",
        },
      ],
    },
  },
})
