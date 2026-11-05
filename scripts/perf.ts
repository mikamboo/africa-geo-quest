import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

/**
 * Proxy de performance : Chromium, processeur ralenti ×4, déplacement continu sur la carte.
 * Ce n'est PAS une mesure sur appareil réel. Sans GPU, le rendu passe par SwiftShader, sur le processeur.
 */
const PORT = 4176;
const BASE = `http://localhost:${PORT}/`;

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 80; i += 1) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // Le serveur démarre encore.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Serveur injoignable');
}

const server = spawn(
  'node_modules/.bin/vite',
  ['preview', '--port', String(PORT), '--strictPort'],
  {
    stdio: 'ignore',
  },
);

async function measure(gpuArgs: string[], label: string, throttle: number) {
  const browser = await chromium.launch({ args: gpuArgs });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.goto(BASE);
  await page.evaluate(() =>
    localStorage.setItem(
      'tembea.progress',
      JSON.stringify({
        version: 1,
        profile: { avatar: 'kofi', pseudonym: { animal: 'lion', adjective: 'calm' } },
        level: 'geographer',
        stamps: {},
        discoveredPlaces: [],
        crossedRivers: [],
        leitner: {},
        missionsCompleted: 0,
        quizCorrect: 0,
        quizAnswered: 0,
        points: 0,
        lastPosition: null,
      }),
    ),
  );
  await page.goto(BASE);
  await page.getByTestId('mode-explore').click();
  await page.getByTestId('game-canvas').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1500);
  const renderer = await page.evaluate<string>(`
    (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const info = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'inconnu';
    })()
  `);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await cdp.send('Performance.enable');
  const readMetrics = async (): Promise<Record<string, number>> => {
    const { metrics } = await cdp.send('Performance.getMetrics');
    return Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
  };
  const before = await readMetrics();
  await page.keyboard.down('ArrowLeft');
  // Chaîne plutôt que fonction : `tsx` ajoute sinon des assistants absents du navigateur.
  const result = await page.evaluate<{ fps: number; p95FrameMs: number; frames: number }>(`
    new Promise((resolve) => {
      const deltas = [];
      let last = performance.now();
      const start = last;
      const loop = (now) => {
        deltas.push(now - last);
        last = now;
        if (now - start < 12000) {
          requestAnimationFrame(loop);
          return;
        }
        const sorted = [...deltas].sort((a, b) => a - b);
        resolve({
          fps: Math.round((deltas.length / ((now - start) / 1000)) * 10) / 10,
          p95FrameMs: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10,
          frames: deltas.length,
        });
      };
      requestAnimationFrame(loop);
    })
  `);
  await page.keyboard.up('ArrowLeft');
  const after = await readMetrics();
  await browser.close();
  // Temps de script par image, indépendant du GPU : c'est ce que le code du jeu maîtrise.
  const scriptMsPerFrame =
    Math.round((((after.ScriptDuration! - before.ScriptDuration!) * 1000) / result.frames) * 10) /
    10;
  return { label, cpuThrottle: throttle, renderer: String(renderer), scriptMsPerFrame, ...result };
}

try {
  await waitForServer();
  const software = [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ];
  const results = [
    await measure(software, 'SwiftShader, sans ralentissement', 1),
    await measure(software, 'SwiftShader, CPU ×4', 4),
  ];
  // Un GPU réel n'est mesuré que s'il est vraiment disponible : sinon on le dit, sans simuler.
  const gpu = await measure(
    ['--use-gl=angle', '--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist'],
    'Tentative GPU matériel, CPU ×4',
    4,
  ).catch((error: unknown) => ({ label: 'GPU matériel indisponible', error: String(error) }));
  results.push(gpu as (typeof results)[number]);
  mkdirSync('docs/reports', { recursive: true });
  writeFileSync(
    'docs/reports/fps-proxy.json',
    `${JSON.stringify({ note: "Proxy Chromium : ce n'est pas une mesure sur appareil réel.", date: new Date().toISOString().slice(0, 10), results }, null, 2)}\n`,
  );
  console.log(results);
} finally {
  server.kill();
}
