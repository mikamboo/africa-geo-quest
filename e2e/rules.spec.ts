import { expect, test } from '@playwright/test';
import { createProfile, expectClean, watchPage } from './helpers';

// Premier lancement : aucun réglage enregistré.
test.use({ storageState: { cookies: [], origins: [] } });

test('les règles s’affichent au premier lancement, une seule fois', async ({ page }) => {
  const guards = watchPage(page);
  await page.goto('/');
  const rules = page.getByTestId('rules');
  await expect(rules).toBeVisible();
  await expect(rules.getByRole('listitem')).toHaveCount(5);
  await page.getByTestId('rules-close').click();
  await expect(rules).toBeHidden();
  await page.reload();
  await expect(page.getByTestId('start')).toBeVisible();
  await expect(rules).toBeHidden();
  expectClean(guards);
});

test('la modale renvoie vers toutes les règles', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('rules-all').click();
  await expect(page.getByTestId('rules-screen')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('rules')).toBeHidden();
});

test('Échap ferme les règles', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('rules')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('rules')).toBeHidden();
  await page.reload();
  await expect(page.getByTestId('rules')).toBeHidden();
});

test.describe('règles déjà vues', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${process.env.E2E_PORT ?? '4173'}`,
          localStorage: [{ name: 'tembea.settings', value: JSON.stringify({ seenRules: true }) }],
        },
      ],
    },
  });

  test('les réglages permettent de les revoir', async ({ page }) => {
    await createProfile(page);
    await page.getByTestId('open-settings').click();
    await expect(page.getByTestId('rules')).toBeHidden();
    await page.getByTestId('settings-rules').click();
    await expect(page.getByTestId('rules-screen')).toBeVisible();
  });

  test('l’accueil mène à toutes les règles, section par section', async ({ page }) => {
    await createProfile(page);
    await page.getByTestId('open-rules').click();
    await expect(page.getByTestId('rules-screen')).toBeVisible();
    for (const id of ['explore', 'missions', 'quiz', 'daily', 'stories', 'levels', 'score']) {
      await expect(page.getByTestId(`rules-section-${id}`)).toBeVisible();
    }
    // Aucun paramètre non résolu ne doit s'afficher.
    await expect(page.getByTestId('rules-screen')).not.toContainText('{{');
    await page.getByRole('button', { name: 'Retour' }).click();
    await expect(page.getByTestId('mode-explore')).toBeVisible();
  });
});
