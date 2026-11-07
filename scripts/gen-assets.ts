import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import silhouette from '../src/data/generated/silhouette.json';

/** Icônes, favicon et image Open Graph, générés par code depuis la silhouette du continent. */
const font = readFileSync(
  'node_modules/@fontsource/fraunces/files/fraunces-latin-900-normal.woff2',
).toString('base64');
const body = readFileSync(
  'node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2',
).toString('base64');

const map = (fill: string, stroke: string) =>
  `<path d="${silhouette.d}" fill="${fill}" stroke="${stroke}" stroke-width="10" stroke-linejoin="round"/>`;

function iconSvg(background: string, padding: number): string {
  const size = 1000;
  const scale = (size - padding * 2) / Math.max(silhouette.width, silhouette.height);
  const x = (size - silhouette.width * scale) / 2;
  const y = (size - silhouette.height * scale) / 2;
  const radius = padding < 200 ? 180 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/><g transform="translate(${x} ${y}) scale(${scale})">${map('#f0b03a', '#2a1a12')}</g></svg>`;
}

const band = `<div style="height:36px;background:repeating-linear-gradient(90deg,#b5381f 0 72px,#f0b03a 72px 108px,#3f6a1f 108px 180px,#fff6e3 180px 216px,#1e6f8f 216px 288px)"></div>`;
const ogHtml = `<!doctype html><style>
@font-face{font-family:L;src:url(data:font/woff2;base64,${font})}
@font-face{font-family:N;src:url(data:font/woff2;base64,${body});font-weight:700}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:#f6e4bf;color:#2a1a12;overflow:hidden}
.w{display:flex;align-items:center;justify-content:space-between;padding:30px 70px;height:594px}
h1{font:400 170px/0.95 L;color:#b5381f}
p{font:700 42px/1.2 N;margin-top:24px;max-width:640px}
svg{height:520px}</style>${band}<div class="w"><div><h1>Tembea</h1><p>Marche l'Afrique. 54 pays t'attendent.</p></div>
<svg viewBox="-10 -10 ${silhouette.width + 20} ${silhouette.height + 20}"><path d="${silhouette.d}" transform="translate(12 14)" fill="#2a1a12"/>${map('#8db85a', '#2a1a12')}</svg></div>`;

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/favicon.svg', iconSvg('#b5381f', 110));

const browser = await chromium.launch();
async function render(html: string, width: number, height: number, path: string): Promise<void> {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path, omitBackground: false });
  await page.close();
}
const iconHtml = (svg: string, size: number) =>
  `<!doctype html><style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`;
await render(iconHtml(iconSvg('#b5381f', 110), 192), 192, 192, 'public/icons/icon-192.png');
await render(iconHtml(iconSvg('#b5381f', 110), 512), 512, 512, 'public/icons/icon-512.png');
await render(
  iconHtml(iconSvg('#b5381f', 220), 512),
  512,
  512,
  'public/icons/icon-maskable-512.png',
);
await render(ogHtml, 1200, 630, 'public/og-image.png');
await browser.close();
console.log('Icônes et image Open Graph générées.');
