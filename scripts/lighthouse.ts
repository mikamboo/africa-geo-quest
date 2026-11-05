import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

/** Lance Lighthouse sur le build local, avec le Chromium de Playwright, et échoue sous 90. */
const THRESHOLD = 90;
const PORT = 4175;
const URL_TO_TEST = `http://localhost:${PORT}/`;
const CATEGORIES = ['performance', 'accessibility', 'best-practices'] as const;

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 80; i += 1) {
    try {
      if ((await fetch(URL_TO_TEST)).ok) return;
    } catch {
      // Le serveur démarre encore.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Serveur de prévisualisation injoignable');
}

process.env.CHROME_PATH = process.env.CHROME_PATH ?? chromium.executablePath();
const server = spawn(
  'node_modules/.bin/vite',
  ['preview', '--port', String(PORT), '--strictPort'],
  {
    stdio: 'ignore',
  },
);
let failed = false;

try {
  await waitForServer();
  mkdirSync('docs/reports', { recursive: true });
  // Sous WSL, chrome-launcher calcule sinon un chemin Windows, créé tel quel à la racine du projet.
  const profile = '.cache/lighthouse-profile';
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const chrome = await launch({
    userDataDir: resolve(profile),
    chromeFlags: ['--headless=new', '--no-sandbox'],
  });
  try {
    const summary: Record<string, Record<string, number>> = {};
    for (const formFactor of ['mobile', 'desktop'] as const) {
      const result = await lighthouse(
        URL_TO_TEST,
        { port: chrome.port, output: 'html', logLevel: 'error', onlyCategories: [...CATEGORIES] },
        formFactor === 'desktop'
          ? {
              extends: 'lighthouse:default',
              settings: {
                formFactor: 'desktop',
                screenEmulation: {
                  mobile: false,
                  width: 1350,
                  height: 940,
                  deviceScaleFactor: 1,
                  disabled: false,
                },
                throttlingMethod: 'simulate',
                throttling: {
                  rttMs: 40,
                  throughputKbps: 10240,
                  cpuSlowdownMultiplier: 1,
                  requestLatencyMs: 0,
                  downloadThroughputKbps: 0,
                  uploadThroughputKbps: 0,
                },
              },
            }
          : undefined,
      );
      if (!result) throw new Error('Lighthouse ne renvoie aucun résultat');
      const scores: Record<string, number> = {};
      for (const category of CATEGORIES) {
        const score = Math.round((result.lhr.categories[category]?.score ?? 0) * 100);
        scores[category] = score;
        console.log(`${formFactor.padEnd(8)} ${category.padEnd(16)} ${score}`);
        if (score < THRESHOLD) failed = true;
      }
      const lcp = result.lhr.audits['largest-contentful-paint']?.numericValue ?? 0;
      scores.lcpMs = Math.round(lcp);
      console.log(`${formFactor.padEnd(8)} LCP              ${scores.lcpMs} ms`);
      if (lcp >= 2500) failed = true;
      summary[formFactor] = scores;
      writeFileSync(`docs/reports/lighthouse-${formFactor}.html`, String(result.report));
    }
    writeFileSync('docs/reports/lighthouse-summary.json', `${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    chrome.kill();
  }
} finally {
  server.kill();
}
if (failed) {
  console.error(`Un score est inférieur à ${THRESHOLD} ou le LCP dépasse 2,5 s.`);
  process.exit(1);
}
