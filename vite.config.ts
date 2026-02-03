import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brand/*.png', 'favicon.ico'],
      manifest: {
        name: 'ERP Field Map',
        short_name: 'ERP Map',
        description: 'Offline-capable field mapping for ERP operations',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
          {
            src: '/brand/erp-logo.png',
            sizes: '202x249',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.pmtiles$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pmtiles-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Cache Esri satellite tiles
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/.*\/tile\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'satellite-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Cache Nominatim geocoding responses
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'geocoding-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.CONTENT_BASE_URL': JSON.stringify(
      process.env.CONTENT_BASE_URL || ''
    ),
  },
  server: {
    host: true, // Expose to network for mobile testing
  },
});
