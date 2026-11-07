import { expect, test } from '@playwright/test';
import { createProfile, expectClean, followHint, isMobile, Walker, watchPage } from './helpers';

test('réussir une mission en se guidant avec la boussole', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const guards = watchPage(page);
  await createProfile(page);
  await page.getByTestId('mode-missions').click();
  await expect(page.getByTestId('mission-go-to-place')).toBeVisible();
  await expect(page.getByTestId('mission-cross-river')).toBeVisible();
  await page.getByTestId('mission-find-landlocked').getByRole('button').click();

  await expect(page.getByTestId('mission-banner')).toContainText('sans accès à la mer');
  await expect(page.getByTestId('mission-hint')).toBeVisible();
  const walker = new Walker(page, isMobile(testInfo));
  const success = page.getByTestId('mission-success');
  await walker.walkUntil(followHint(page), () => success.isVisible());
  await expect(success).toContainText('+100 points');
  await success.getByRole('button', { name: 'Continuer à voyager' }).click();
  await expect(page.getByTestId('mission-banner')).toBeHidden();
  await page.getByTestId('hud-menu').click();
  await page.getByTestId('open-passport').click();
  await expect(page.getByText('1 mission réussie')).toBeVisible();
  expectClean(guards);
});

test('traverser un fleuve valide la mission correspondante', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await createProfile(page);
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('tembea.progress')!);
    // Départ au nord de la RDC : le Congo est à quelques secondes de marche.
    save.lastPosition = { x: -60, y: 310 };
    save.crossedRivers = ['nile', 'niger', 'zambezi', 'orange', 'limpopo', 'senegal'];
    localStorage.setItem('tembea.progress', JSON.stringify(save));
  });
  await page.reload();
  await page.getByTestId('mode-missions').click();
  await expect(page.getByTestId('mission-cross-river')).toContainText('Congo');
  await page.getByTestId('mission-cross-river').getByRole('button').click();
  const walker = new Walker(page, isMobile(testInfo));
  const success = page.getByTestId('mission-success');
  await walker.walkUntil(followHint(page), () => success.isVisible());
  await expect(success).toBeVisible();
});

test('le quiz corrige avec bienveillance et prépare la révision', async ({ page }) => {
  const guards = watchPage(page);
  await createProfile(page);
  await page.getByTestId('mode-quiz').click();

  const total = 5;
  for (let index = 0; index < total; index += 1) {
    await expect(page.getByTestId('quiz-question')).toBeVisible();
    const options = page.getByTestId('quiz-option');
    if (index === 0) {
      // Une mauvaise réponse montre la bonne, sans sanction.
      await options.and(page.locator(':not([data-correct])')).first().click();
      await expect(page.getByTestId('quiz-feedback')).toContainText('Bien essayé');
      await expect(page.getByTestId('quiz-feedback')).toContainText('reviendra');
      await expect(page.locator('.quiz-option.is-answer')).toHaveCount(1);
    } else {
      await page.locator('[data-testid="quiz-option"][data-correct="true"]').click();
      await expect(page.getByTestId('quiz-feedback')).toContainText('Bravo');
    }
    await page.getByTestId('quiz-next').click();
  }
  await expect(page.getByTestId('quiz-score')).toHaveText('4 bonnes réponses sur 5');
  const leitner = await page.evaluate(
    () => JSON.parse(localStorage.getItem('tembea.progress')!).leitner,
  );
  expect(Object.keys(leitner)).toHaveLength(5);
  expect(Object.values(leitner as Record<string, { box: number }>).every((c) => c.box === 1)).toBe(
    true,
  );
  expectClean(guards);
});

test('une erreur revient au quiz suivant', async ({ page }) => {
  await createProfile(page);
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('tembea.progress')!);
    save.leitner = { 'capital-of:SEN': { box: 1, dueDay: 0 } };
    localStorage.setItem('tembea.progress', JSON.stringify(save));
  });
  await page.reload();
  await page.getByTestId('mode-quiz').click();
  await expect(page.getByTestId('quiz-question')).toHaveAttribute('data-item', 'capital-of:SEN');
});

test('le défi du jour démarre la même mission sur deux profils', async ({ page, browser }) => {
  await createProfile(page);
  await page.getByTestId('mode-daily').click();
  const banner = page.getByTestId('mission-banner');
  await expect(banner).toBeVisible();
  const first = await banner.locator('.mission-banner__title').innerText();
  await expect(page.getByTestId('play-screen')).toHaveAttribute('data-mode', 'daily');

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await createProfile(otherPage, 'geographer');
  await otherPage.getByTestId('mode-daily').click();
  await expect(
    otherPage.getByTestId('mission-banner').locator('.mission-banner__title'),
  ).toHaveText(first);
  await other.close();
});
