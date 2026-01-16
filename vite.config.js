import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/altona_app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo-altonadock.png', 'bg-lighthouse.jpg'],
      manifest: {
        name: 'Altonadock Sales Tracker',
        short_name: 'Altona Sales',
        description: 'Control de ventas del córner Altonadock',
        theme_color: '#c4a574',
        background_color: '#0d1015',
        display: 'standalone',
        orientation: 'any',
        start_url: '/altona_app/',
        scope: '/altona_app/',
        icons: [
          {
            src: 'logo-altonadock.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'logo-altonadock.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}']
      }
    })
  ],
  server: {
    port: 3000,
    open: true
  }
})

