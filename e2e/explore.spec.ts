import { expect, test } from '@playwright/test';
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
