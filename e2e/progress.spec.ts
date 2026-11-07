import { expect, test } from '@playwright/test';
import { createProfile, expectClean, goTowards, isMobile, Walker, watchPage } from './helpers';

test('la progression persiste après rechargement', async ({ page }, testInfo) => {
  const guards = watchPage(page);
  await createProfile(page);
  await expect(page.getByTestId('profile-name')).toBeVisible();
  const name = await page.getByTestId('profile-name').innerText();

  await page.getByTestId('mode-explore').click();
  const hud = page.getByTestId('hud-country');
  await expect(hud).toHaveAttribute('data-code', 'CAF');
  const walker = new Walker(page, isMobile(testInfo));
  await walker.walkUntil(goTowards(page, 16, 18.5), async () => {
    return (await hud.getAttribute('data-code')) === 'TCD';
  });
  await page.getByTestId('hud-menu').click();

  await page.reload();
  await expect(page.getByTestId('profile-name')).toHaveText(name);
  await page.getByTestId('open-passport').click();
  await expect(page.getByTestId('stamp-CAF')).toHaveAttribute('data-stamped', 'true');
  await expect(page.getByTestId('stamp-TCD')).toHaveAttribute('data-stamped', 'true');
  await expect(page.getByTestId('stamp-SEN')).toHaveAttribute('data-stamped', 'false');
  await expect(page.getByTestId('passport-percent')).toHaveAttribute('data-percent', '4');
  expectClean(guards);
});

test('un badge récompense une région complète et le niveau Géographe affiche plus de lieux', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    const stamps = Object.fromEntries(
      ['BWA', 'SWZ', 'LSO', 'NAM', 'ZAF'].map((code) => [code, '2026-11-01']),
    );
    localStorage.setItem(
      'tembea.progress',
      JSON.stringify({
        version: 1,
        profile: { avatar: 'zola', pseudonym: { animal: 'lion', adjective: 'calm' } },
        level: 'geographer',
        stamps,
        discoveredPlaces: [],
        crossedRivers: [],
        leitner: {},
        missionsCompleted: 0,
        quizCorrect: 0,
        quizAnswered: 0,
        points: 0,
        lastPosition: null,
      }),
    );
  });
  await page.reload();
  await page.getByTestId('open-passport').click();
  await expect(page.getByTestId('badge-south')).toHaveAttribute('data-earned', 'true');
  await expect(page.getByTestId('badge-west')).toHaveAttribute('data-earned', 'false');
});

test('des données corrompues sont écartées proprement', async ({ page }) => {
  const guards = watchPage(page);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('tembea.progress', '{"version":1,"stamps":"pas un objet"');
    localStorage.setItem('tembea.settings', 'pas du json');
    localStorage.setItem('tembea.scores', '[{"dateKey":3}]');
  });
  await page.reload();
  await expect(page.getByTestId('recovered-notice')).toBeVisible();
  await expect(page.getByTestId('start')).toBeVisible();
  const raw = await page.evaluate(() => localStorage.getItem('tembea.progress'));
  expect(raw).toBeNull();
  await page.getByRole('button', { name: "D'accord" }).click();
  await expect(page.getByTestId('recovered-notice')).toBeHidden();
  expectClean(guards);
});

test('un pseudonyme forgé hors liste est refusé', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'tembea.progress',
      JSON.stringify({
        version: 1,
        profile: { avatar: 'zola', pseudonym: { animal: 'Jean Dupont', adjective: 'calm' } },
        level: 'explorer',
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
    );
  });
  await page.reload();
  await expect(page.getByTestId('recovered-notice')).toBeVisible();
});

test('la réinitialisation efface tout depuis la page parents', async ({ page }) => {
  await createProfile(page);
  await page.getByTestId('open-parents').click();
  await page.getByTestId('reset').click();
  await page.getByTestId('reset-confirm').click();
  await expect(page.getByTestId('start')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('tembea.progress'))).toBeNull();
});

test('le changement de langue traduit et persiste', async ({ page }) => {
  await createProfile(page);
  await page.getByTestId('lang-en').click();
  await expect(page.getByTestId('mode-explore')).toContainText('Free travel');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload();
  await expect(page.getByTestId('mode-explore')).toContainText('Free travel');
  await page.getByTestId('mode-explore').click();
  await expect(page.getByTestId('card-name')).toHaveText('Central African Republic');
  await page.getByTestId('hud-menu').click();
  await page.getByTestId('lang-fr').click();
  await expect(page.getByTestId('mode-explore')).toContainText('Voyage libre');
});
