// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/image',
    '@vueuse/nuxt',
    '@nuxtjs/seo',
  ],

  site: {
    url: 'https://madsnorgaard.net',
    name: 'Mads Norgaard',
    description: 'Self-taught senior developer and DevOps engineer. 15 years building on Drupal, PHP, Docker, Linux. Documentary photographer.',
    defaultLocale: 'en',
  },

  // nuxt-seo-utils: keep share-relevant query params in the canonical / og:url
  // (default whitelist drops them), so each ?photo=<id> share caches separately.
  seo: {
    canonicalQueryWhitelist: [
      'page', 'sort', 'filter', 'search', 'q', 'category', 'tag',
      'photo', 'set', 'favs',
    ],
  },

  sitemap: {
    sources: ['/api/__sitemap__/urls'],
    exclude: ['/api/**'],
  },

  robots: {
    groups: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
  },

  schemaOrg: {
    identity: {
      type: 'Person',
      name: 'Mads Norgaard',
      url: 'https://madsnorgaard.net',
      image: 'https://madsnorgaard.net/og-image.png',
      jobTitle: 'Senior Developer & DevOps Engineer',
      sameAs: [
        'https://github.com/madsnorgaard',
        'https://photo.madsnorgaard.net',
      ],
    },
  },

  image: {
    domains: ['photo.madsnorgaard.net'],
    quality: 80,
    format: ['avif', 'webp', 'jpg'],
  },

  runtimeConfig: {
    // Private: server only
    drupalBaseUrl: process.env.DRUPAL_BASE_URL || 'http://drupal:80',
    githubToken: process.env.GITHUB_TOKEN || '',
    photoSiteUrl: process.env.PHOTO_SITE_URL || 'https://photo.madsnorgaard.net',
    public: {
      siteUrl: 'https://madsnorgaard.net',
    },
  },

  app: {
    head: {
      title: 'Mads Nørgaard: Developer + DevOps',
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
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
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
          href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=IBM+Plex+Mono:wght@400;500&display=swap',
        },
      ],
      script: [
        {
          defer: true,
          'data-domain': 'madsnorgaard.net',
          src: 'https://analytics.theazanianprepper.online/js/script.file-downloads.hash.outbound-links.js',
        },
        {
          innerHTML: "window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }",
        },
        // HTML easter egg, visible in View Source
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

  // HTTP security headers + page caching
  routeRules: {
    // Redirects for old WordPress paths — indexed traffic belongs on photo.madsnorgaard.net
    '/one-picture-stories/**': { redirect: { to: 'https://photo.madsnorgaard.net/one-picture-stories/**', statusCode: 301 } },

    // Event wall (Cold Turkey): short SWR on reads, NEVER cache the writes.
    '/api/event/photos/**': { swr: 120 },
    '/api/event/sets': { swr: 600 },
    '/api/event/photo/**': { swr: 60 },
    '/api/event/top': { swr: 300 },
    '/api/event/like': { swr: false, cache: false },
    '/api/event/there': { swr: false, cache: false },
    // No caching: the same path serves GET (notes list) and POST (submit);
    // caching the path wraps the POST and eats its body before readBody runs.
    '/api/event/notes': { swr: false, cache: false },
    '/api/event/favourites-zip': { swr: false, cache: false },

    // Photo API route caching
    '/api/photo/**': { swr: 300 },
    '/api/wp/stories/**': { swr: 300 },
    '/api/wp/series/**': { swr: 600 },
    '/api/wp/subjects/**': { swr: 600 },
    '/api/wp/categories/**': { swr: 600 },
    '/api/wp/tags/**': { swr: 600 },
    '/api/wp/posts/**': { swr: 300 },

    '/**': {
      swr: 300, // cache rendered pages for 5 minutes, revalidate in background
      headers: {
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        // CSP: allow Nuxt SSR inline scripts, Google Fonts, self for everything else
        'Content-Security-Policy': [
          "default-src 'self'",
          // w.soundcloud.com: the SoundCloud Widget API (player/api.js) that
          // drives the Cold Turkey mix player's play/pause.
          "script-src 'self' 'unsafe-inline' https://analytics.theazanianprepper.online https://w.soundcloud.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: https:",
          "connect-src 'self' https://analytics.theazanianprepper.online",
          // SoundCloud widget (Cold Turkey mix player on the photo wall)
          "frame-src https://w.soundcloud.com",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "upgrade-insecure-requests",
        ].join('; '),
      },
    },
  },

  nitro: {
    // Ensure server routes can reach internal Docker services
    routeRules: {
      '/api/**': { cors: false },
    },
    // @resvg/resvg-js uses native Node bindings — must not be bundled
    externals: {
      external: ['@resvg/resvg-js'],
    },
  },
})
