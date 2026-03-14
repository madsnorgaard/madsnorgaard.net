// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/image',
    '@vueuse/nuxt',
  ],

  runtimeConfig: {
    // Private — server only
    drupalBaseUrl: process.env.DRUPAL_BASE_URL || 'http://drupal:80',
    githubToken: process.env.GITHUB_TOKEN || '',
    photoSiteUrl: process.env.PHOTO_SITE_URL || 'https://photo.madsnorgaard.net',
    public: {
      siteUrl: 'https://madsnorgaard.net',
    },
  },

  app: {
    head: {
      title: 'Mads Nørgaard — Developer + DevOps',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Self-taught senior developer and DevOps engineer. 15 years building on Drupal, PHP, Docker, Linux. Documentary photographer.',
        },
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700i&family=IBM+Plex+Mono:wght@400;500&display=swap',
        },
      ],
      // HTML easter egg — visible in View Source
      script: [
        {
          type: 'text/plain',
          innerHTML: `
/*
 You found it.

 Built with Nuxt 3 + Drupal 11 (headless) + GitHub API + Docker
 Source: github.com/madsnorgaard/madsnorgaard.net

 The photography lives at photo.madsnorgaard.net
 The Drupal lab lives at drupal.madsnorgaard.net

 Say hello: mads@madsnorgaard.net
*/
          `.trim(),
        },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  css: ['~/assets/css/main.css'],

  nitro: {
    // Ensure server routes can reach internal Docker services
    routeRules: {
      '/api/**': { cors: false },
    },
  },
})
