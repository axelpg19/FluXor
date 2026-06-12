import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'apple-touch-icon.png', 'logo-fluxor.png'],
      manifest: {
        name: 'FluXor',
        short_name: 'FluXor',
        description: 'Tu copiloto financiero personal',
        theme_color: '#151515',
        background_color: '#151515',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: '/icon-192.png',      sizes: '192x192',  type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png',      sizes: '512x512',  type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable.png', sizes: '512x512',  type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: []
      }
    })
  ],
  server: { port: 5174 }
});
