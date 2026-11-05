/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

interface VercelConfig {
  headers: { source: string; headers: { key: string; value: string }[] }[];
}

/** `vercel.json` est l'unique source de vérité des en-têtes : `vite preview` les réapplique. */
function securityHeaders(): Record<string, string> {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as VercelConfig;
  const entries = config.headers.flatMap((rule) => rule.headers);
  return Object.fromEntries(entries.map(({ key, value }) => [key, value]));
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Fichier externe : la CSP interdit les scripts en ligne.
      injectRegister: 'script-defer',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Tembea',
        short_name: 'Tembea',
        description: "Marche l'Afrique : 54 pays, leurs capitales, fleuves et reliefs à découvrir.",
        lang: 'fr',
        theme_color: '#b5381f',
        background_color: '#f6e4bf',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,svg,png,woff2}'],
        globIgnores: ['**/og-image.png'],
        navigateFallback: '/index.html',
        // Le cache doit protéger la toute première session, sans attendre un rechargement.
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  preview: { headers: securityHeaders() },
  build: { target: 'es2022', sourcemap: false },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      exclude: ['src/core/**/*.test.ts', 'src/core/**/types.ts', 'src/core/testing.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 80 },
    },
  },
});
