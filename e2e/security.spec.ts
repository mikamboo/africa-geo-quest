import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createProfile, expectClean, goTowards, isMobile, Walker, watchPage } from './helpers';

test('aucune requête hors origine, aucun cookie, pendant une vraie partie', async ({
  page,
  context,
}, testInfo) => {
  const guards = watchPage(page);
  await createProfile(page);
  await page.getByTestId('mode-explore').click();
  const hud = page.getByTestId('hud-country');
  await expect(hud).toHaveAttribute('data-code', 'CAF');
  const walker = new Walker(page, isMobile(testInfo));
  await walker.walkUntil(goTowards(page, 16, 18.5), async () => {
    return (await hud.getAttribute('data-code')) === 'TCD';
  });
  await page.getByTestId('hud-menu').click();
  await page.getByTestId('mode-quiz').click();
  await expect(page.getByTestId('quiz-question')).toBeVisible();
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).toBe('');
  expectClean(guards);
});

test('les en-têtes de vercel.json sont servis', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();
  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['content-security-policy']).not.toContain('unsafe-eval');
  expect(headers['strict-transport-security']).toContain('max-age');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
});

test('le jeu reste jouable hors ligne après le premier chargement', async ({ page, context }) => {
  await createProfile(page);
  // Le service worker contrôle la page puis met tout en cache.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), {
      timeout: 30_000,
    })
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('mode-explore')).toBeVisible();
  await page.getByTestId('mode-explore').click();
  await expect(page.getByTestId('game-canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('hud-country')).toHaveAttribute('data-code', 'CAF');
  await expect(page.getByTestId('card-flag')).toBeVisible();
  await context.setOffline(false);
});

test('un lien externe passe par un écran d’avertissement', async ({ page, context }) => {
  await createProfile(page);
  await page.getByTestId('open-parents').click();
  await page.getByRole('button', { name: 'Site de Natural Earth' }).click();
  await expect(page.getByTestId('external-warning')).toBeVisible();
  await expect(page.getByTestId('external-host')).toHaveText('www.naturalearthdata.com');
  expect(context.pages()).toHaveLength(1);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('external-warning')).toBeHidden();
  expect(context.pages()).toHaveLength(1);
});

test('aucune saisie libre n’existe dans le profil', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start').click();
  await expect(page.locator('input[type="text"], textarea, [contenteditable]')).toHaveCount(0);
});

test.describe('accessibilité (axe-core)', () => {
  const check = async (page: Page, name: string) => {
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(
      serious.map((v) => `${name}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  };

  test('écrans principaux', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/');
    await expect(page.getByTestId('start')).toBeVisible();
    await check(page, 'accueil vide');
    await page.getByTestId('start').click();
    await check(page, 'profil');
    await page.getByTestId('setup-go').click();
    await check(page, 'accueil');
    await page.getByTestId('mode-explore').click();
    await expect(page.getByTestId('game-canvas')).toBeVisible();
    await expect(page.getByTestId('country-card')).toBeVisible();
    await check(page, 'jeu');
    await page.getByTestId('hud-menu').click();
    await page.getByTestId('mode-missions').click();
    await expect(page.getByTestId('mission-go-to-place')).toBeVisible();
    await check(page, 'missions');
    await page.getByRole('button', { name: 'Retour' }).click();
    await page.getByTestId('mode-quiz').click();
    await expect(page.getByTestId('quiz-question')).toBeVisible();
    await check(page, 'quiz');
    await page.getByTestId('quiz-option').first().click();
    await check(page, 'quiz corrigé');
    await page.getByRole('button', { name: 'Retour' }).click();
    await page.getByTestId('open-passport').click();
    await check(page, 'passeport');
    await page.getByRole('button', { name: 'Retour' }).click();
    await page.getByTestId('open-parents').click();
    await check(page, 'parents');
    await page.getByRole('button', { name: 'Retour' }).click();
    await page.getByTestId('open-settings').click();
    await check(page, 'réglages');
    await page.getByTestId('toggle-noMovement').check();
    await page.getByRole('button', { name: 'Retour' }).click();
    await page.getByTestId('mode-explore').click();
    await expect(page.getByTestId('svg-map')).toBeVisible();
    await check(page, 'carte SVG');
  });

  test('le clavier seul permet de créer un profil et de lancer une partie', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('start').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('setup-go').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('mode-explore').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('game-canvas')).toBeVisible();
    await expect(page.getByTestId('hud-country')).toHaveAttribute('data-code', 'CAF');
    await expect(page.getByTestId('hud-position')).toBeVisible();
    const before = await page.getByTestId('hud-position').getAttribute('data-lat');
    await page.keyboard.down('KeyW');
    await expect
      .poll(async () => page.getByTestId('hud-position').getAttribute('data-lat'))
      .not.toBe(before);
    await page.keyboard.up('KeyW');
  });

  test('réduire les animations et police dyslexie s’appliquent', async ({ page }) => {
    await createProfile(page);
    await page.getByTestId('open-settings').click();
    await page.getByTestId('toggle-reduceMotion').check();
    await page.getByTestId('toggle-dyslexia').check();
    await expect(page.locator('html')).toHaveClass(/reduce-motion/);
    await expect(page.locator('html')).toHaveClass(/dyslexia/);
    await expect
      .poll(() => page.evaluate(() => document.fonts.check('16px OpenDyslexic')))
      .toBe(true);
  });
});
