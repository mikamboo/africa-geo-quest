import { expect, test, type Page } from '@playwright/test';
import { createProfile, expectClean, goTowards, isMobile, Walker, watchPage } from './helpers';

test('entrer dans un pays affiche sa fiche et pose un tampon', async ({ page }, testInfo) => {
  const guards = watchPage(page);
  await createProfile(page);
  await page.getByTestId('mode-explore').click();
  const hud = page.getByTestId('hud-country');
  await expect(hud).toHaveAttribute('data-code', 'CAF');
  await expect(page.getByTestId('card-name')).toHaveText('République centrafricaine');
  await expect(page.getByTestId('card-capital')).toContainText('Bangui');
  await expect(page.getByTestId('card-flag')).toBeVisible();
  await expect(page.getByTestId('game-canvas')).toBeVisible();

  const walker = new Walker(page, isMobile(testInfo));
  await walker.walkUntil(goTowards(page, 16, 18.5), async () => {
    return (await hud.getAttribute('data-code')) === 'TCD';
  });
  await expect(page.getByTestId('card-name')).toHaveText('Tchad');
  await expect(page.getByTestId('card-capital')).toContainText("N'Djamena");
  await expect(page.getByTestId('hud-percent')).toHaveAttribute('data-stamps', '2');
  expectClean(guards);
});

const startAt = async (page: Page, x: number, y: number) => {
  await page.evaluate(
    ([px, py]) => {
      const save = JSON.parse(localStorage.getItem('tembea.progress')!);
      save.lastPosition = { x: px, y: py };
      localStorage.setItem('tembea.progress', JSON.stringify(save));
    },
    [x, y],
  );
  await page.reload();
};

test('rejoindre un pays insulaire en pirogue', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await createProfile(page);
  // Au large du Mozambique, à quelques centaines de kilomètres à l'ouest des Comores.
  await startAt(page, 2300, 1500);
  await page.getByTestId('mode-explore').click();
  await expect(page.getByTestId('hud-terrain')).toHaveAttribute('data-terrain', 'water');
  const hud = page.getByTestId('hud-country');
  const walker = new Walker(page, isMobile(testInfo));
  await walker.walkUntil(goTowards(page, -11.7, 43.26), async () => {
    return (await hud.getAttribute('data-code')) === 'COM';
  });
  await expect(page.getByTestId('card-name')).toHaveText('Comores');
  await expect(page.getByTestId('card-capital')).toContainText('Moroni');
});

test('un micro-État reste atteignable à pied', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await createProfile(page);
  // Éthiopie orientale, à quelques secondes de Djibouti.
  await startAt(page, 2400, -900);
  await page.getByTestId('mode-explore').click();
  const hud = page.getByTestId('hud-country');
  const walker = new Walker(page, isMobile(testInfo));
  await walker.walkUntil(goTowards(page, 11.6, 42.6), async () => {
    return (await hud.getAttribute('data-code')) === 'DJI';
  });
  await expect(page.getByTestId('card-name')).toHaveText('Djibouti');
  await expect(page.getByTestId('card-fact')).toContainText('Addis-Abeba');
});
