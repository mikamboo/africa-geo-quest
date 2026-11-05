/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

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
  plugins: [react()],
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
