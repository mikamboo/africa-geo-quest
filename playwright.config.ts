import { defineConfig, devices } from '@playwright/test';

// Port réglable : un `pnpm preview` lancé à la main occupe souvent le 4173.
const port = process.env.E2E_PORT ?? '4173';

const swiftShaderArgs = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'off',
    // Les règles du jeu s'affichent au premier lancement : les tests partent d'un joueur qui les a vues.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${port}`,
          localStorage: [{ name: 'tembea.settings', value: JSON.stringify({ seenRules: true }) }],
        },
      ],
    },
    launchOptions: { args: swiftShaderArgs },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `node_modules/.bin/vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
