import { expect, test } from '@playwright/test';
import { createProfile, expectClean, watchPage } from './helpers';

test('le mode sans déplacement permet de jouer à la carte', async ({ page }) => {
  const guards = watchPage(page);
  await createProfile(page);
  await page.getByTestId('open-settings').click();
  await page.getByTestId('toggle-noMovement').check();
  await page.getByRole('button', { name: 'Retour' }).click();
  await page.getByTestId('mode-explore').click();
  await expect(page.getByTestId('svg-map')).toBeVisible();
  await expect(page.getByTestId('game-canvas')).toHaveCount(0);

  // La carte doit réellement dessiner les pays, à une taille plausible.
  const algeria = await page.getByTestId('svg-country-DZA').boundingBox();
  expect(algeria?.width).toBeGreaterThan(40);
  const map = await page.locator('.svgmap__svg').boundingBox();
  expect(algeria!.width).toBeLessThan(map!.width);
  const viewport = page.viewportSize()!;
  expect(map!.y + map!.height).toBeLessThanOrEqual(viewport.height + 1);

  await page.getByTestId('svg-country-select').selectOption('SEN');
  await expect(page.getByTestId('card-name')).toHaveText('Sénégal');
  await expect(page.getByTestId('hud-percent')).toHaveAttribute('data-stamps', '1');

  // Un micro-État reste atteignable au clic, par sa zone agrandie.
  await page.getByTestId('svg-hit-STP').dispatchEvent('click');
  await expect(page.getByTestId('card-name')).toHaveText('Sao Tomé-et-Principe');
  expectClean(guards);
});

test('les missions se réussissent aussi sur la carte à cliquer', async ({ page }) => {
  await createProfile(page);
  await page.getByTestId('open-settings').click();
  await page.getByTestId('toggle-noMovement').check();
  await page.getByRole('button', { name: 'Retour' }).click();
  await page.getByTestId('mode-missions').click();
  await page.getByTestId('mission-find-landlocked').getByRole('button').click();
  await expect(page.getByTestId('svg-map')).toBeVisible();
  await page.getByTestId('svg-country-select').selectOption('SEN');
  await expect(page.getByTestId('mission-success')).toBeHidden();
  await page.getByTestId('svg-country-select').selectOption('MLI');
  await expect(page.getByTestId('mission-success')).toBeVisible();
});

test('sans WebGL, le jeu bascule sur la carte SVG', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    // Simule un navigateur sans WebGL ni WebGPU.
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (type.startsWith('webgl') || type === 'experimental-webgl') return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await createProfile(page);
  await page.getByTestId('mode-explore').click();
  await expect(page.getByTestId('webgl-fallback')).toBeVisible();
  await expect(page.getByTestId('svg-map')).toBeVisible();
  await page.getByTestId('svg-country-select').selectOption('KEN');
  await expect(page.getByTestId('card-name')).toHaveText('Kenya');
});
