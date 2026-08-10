// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      meta: [
        { name: 'theme-color', content: '#6B3A2A' }
      ]
    }
  },
  modules: [
    '@vite-pwa/nuxt',
    '@nuxtjs/supabase'
  ],
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    // Server-only: el módulo NUNCA expone esta clave al cliente.
    secretKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    // Desactivado: la redirección se maneja con nuestro propio middleware (app/middleware/auth.ts).
    redirect: false
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Ferretería SRV',
      short_name: 'Ferretería SRV',
      description: 'Gestión y catálogo de la Ferretería SRV',
      theme_color: '#6B3A2A',
      background_color: '#F5E6D3',
      display: 'standalone',
      start_url: '/',
      lang: 'es',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}']
    },
    devOptions: {
      enabled: false,
      type: 'module'
    }
  }
})
