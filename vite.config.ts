import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Three targets:
//   dev server            served from the root
//   vite build            web app for GitHub Pages, served from /BrickLog/, with service worker
//   vite build --mode app content of the Android app (Capacitor), relative paths, no service worker
export default defineConfig(({ command, mode }) => ({
  base: mode === 'app' ? './' : command === 'build' ? '/BrickLog/' : '/',
  build: {
    outDir: mode === 'app' ? 'dist-app' : 'dist',
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // Running number of the GitHub build; 0 for local builds and the dev server.
    __BUILD__: JSON.stringify(Number(process.env.BRICKLOG_BUILD ?? 0)),
  },
  plugins: [
    svelte(),
    VitePWA({
      disable: mode === 'app',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'BrickLog',
        short_name: 'BrickLog',
        description: 'Klemmbaustein-Sets, Bautagebuch und Wunschliste',
        lang: 'de',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        theme_color: '#c8442b',
        background_color: '#f6f3ee',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
