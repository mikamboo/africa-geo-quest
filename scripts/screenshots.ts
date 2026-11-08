import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from '@playwright/test';

/** Captures réelles du build local, pour la revue visuelle et le README. Argument : dossier de sortie. */
const OUT = process.argv[2] ?? 'docs/screenshots';
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, touch: true },
  { name: 'tablet', width: 768, height: 1024, touch: true },
  { name: 'desktop', width: 1440, height: 900, touch: false },
];
const PORT = 4174;
const BASE = `http://localhost:${PORT}`;

const SAVE = {
  version: 2,
  profile: { avatar: 'amina', pseudonym: { role: 'cartographer', adjective: 'fast' } },
  story: null,
  storiesDone: [],
  notes: [],
  roomsVisited: [],
  level: 'explorer',
  stamps: {
    CAF: '2026-11-01',
    TCD: '2026-11-01',
    CMR: '2026-11-02',
    NGA: '2026-11-02',
    SEN: '2026-11-03',
    GMB: '2026-11-03',
    MAR: '2026-11-03',
    ZAF: '2026-11-04',
    TZA: '2026-11-04',
    EGY: '2026-11-04',
  },
  discoveredPlaces: ['caf-bangui', 'sen-dakar'],
  crossedRivers: ['congo'],
  leitner: {},
  missionsCompleted: 2,
  quizCorrect: 3,
  quizAnswered: 5,
  points: 340,
  lastPosition: null,
};

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // Le serveur démarre encore.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Serveur de prévisualisation injoignable');
}

const server = spawn(
  'node_modules/.bin/vite',
  ['preview', '--port', String(PORT), '--strictPort'],
  {
    stdio: 'ignore',
  },
);

try {
  await waitForServer();
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  });
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const shot = (name: string, target: Page = page) =>
      target.screenshot({ path: join(OUT, `${viewport.name}-${name}.png`) });

    await page.goto(BASE);
    await page.waitForTimeout(300);
    await shot('home-new');
    await page.getByTestId('start').click();
    await page.waitForTimeout(200);
    await shot('setup');

    await page.evaluate(
      (save) => localStorage.setItem('tembea.progress', JSON.stringify(save)),
      SAVE,
    );
    await page.goto(BASE);
    await page.waitForTimeout(300);
    await shot('home');
    await page.getByTestId('mode-explore').click();
    await page.getByTestId('game-canvas').waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await shot('play');
    await page.getByTestId('hud-menu').click();

    await page.getByTestId('mode-missions').click();
    await page.getByTestId('mission-find-landlocked').waitFor();
    await shot('missions');
    await page.getByTestId('mission-go-to-place').getByRole('button').click();
    await page.getByTestId('game-canvas').waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await shot('mission-play');
    await page.getByTestId('hud-menu').click();

    await page.getByTestId('mode-quiz').click();
    await page.getByTestId('quiz-option').first().click();
    await page.waitForTimeout(200);
    await shot('quiz');
    await page.getByRole('button', { name: /Retour|Back/ }).click();

    await page.getByTestId('open-passport').click();
    await page.waitForTimeout(300);
    await shot('passport');
    await page.getByRole('button', { name: /Retour|Back/ }).click();

    await page.getByTestId('open-parents').click();
    await shot('parents');
    await page.getByTestId('parents-contribute').getByTestId('feedback-open').click();
    await page.getByTestId('feedback-fact-wrong').click();
    await shot('feedback');
    await page.getByTestId('feedback-close').click();
    await page.getByRole('button', { name: /^(Retour|Back)$/ }).click();

    await page.evaluate(() =>
      localStorage.setItem('tembea.settings', JSON.stringify({ noMovement: true })),
    );
    await page.goto(BASE);
    await page.getByTestId('mode-explore').click();
    await page.getByTestId('svg-map').waitFor({ timeout: 30_000 });
    await page.waitForTimeout(300);
    await shot('svg');
    await context.close();
  }
  await browser.close();
} finally {
  server.kill();
}
