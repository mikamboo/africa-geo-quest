import { expect, test, type Page } from '@playwright/test';
import { createProfile, expectClean, goTowards, isMobile, Walker, watchPage } from './helpers';

async function seed(page: Page, patch: Record<string, unknown>) {
  await page.evaluate((values) => {
    const save = JSON.parse(localStorage.getItem('tembea.progress')!);
    localStorage.setItem('tembea.progress', JSON.stringify({ ...save, ...values }));
  }, patch);
  await page.reload();
}

test('repasser dans un pays connu n’interrompt pas, la fiche reste à portée', async ({ page }) => {
  const guards = watchPage(page);
  await createProfile(page);
  await page.getByTestId('mode-explore').click();
  await expect(page.getByTestId('country-card')).toBeVisible();
  await page.getByTestId('hud-menu').click();
  await page.getByTestId('mode-explore').click();
  const hud = page.getByTestId('hud-country');
  await expect(hud).toHaveAttribute('data-code', 'CAF');
  await expect(page.getByTestId('country-card')).toBeHidden();
  await hud.click();
  await expect(page.getByTestId('country-card')).toBeVisible();
  expectClean(guards);
});

test('l’aide de prise en main disparaît au premier déplacement, pour de bon', async ({
  page,
}, testInfo) => {
  await createProfile(page);
  await page.getByTestId('mode-explore').click();
  const tutorial = page.getByTestId('tutorial');
  await expect(tutorial).toBeVisible();
  const walker = new Walker(page, isMobile(testInfo));
  await walker.start(0, -1);
  await expect(tutorial).toBeHidden({ timeout: 30_000 });
  await walker.stop();
  await page.getByTestId('hud-menu').click();
  await page.reload();
  await page.getByTestId('mode-explore').click();
  await expect(page.getByTestId('hud-country')).toHaveAttribute('data-code', /.+/);
  await expect(tutorial).toBeHidden();
});

test('le pas rapide fait vraiment avancer plus vite', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await createProfile(page);
  await page.getByTestId('mode-explore').click();
  await expect(page.getByTestId('hud-position')).toBeVisible();
  const position = page.getByTestId('hud-position');
  const walker = new Walker(page, isMobile(testInfo));
  const measure = async (): Promise<number> => {
    const before = Number(await position.getAttribute('data-lat'));
    await walker.start(0, -1);
    await page.waitForTimeout(4000);
    await walker.stop();
    await page.waitForTimeout(400);
    return Math.abs(Number(await position.getAttribute('data-lat')) - before);
  };
  const normal = await measure();
  await page.getByTestId('sprint-toggle').click();
  await expect(page.getByTestId('sprint-toggle')).toHaveAttribute('aria-pressed', 'true');
  const fast = await measure();
  expect(fast).toBeGreaterThan(normal * 1.4);
});

test('la mini-carte bascule la vue d’ensemble sans erreur', async ({ page }) => {
  const guards = watchPage(page);
  await createProfile(page);
  await page.getByTestId('mode-explore').click();
  await page.getByRole('button', { name: 'Fermer la fiche' }).click();
  await expect(page.getByTestId('country-card')).toBeHidden();
  await page.getByTestId('minimap').click();
  await page.waitForTimeout(600);
  await page.getByTestId('minimap').click();
  expectClean(guards);
});

test('le niveau Expert cache la boussole jusqu’à ce qu’on la demande', async ({ page }) => {
  await createProfile(page, 'expert');
  await page.getByTestId('mode-missions').click();
  await page.getByTestId('mission-find-landlocked').getByRole('button').click();
  await expect(page.getByTestId('ask-hint')).toBeVisible();
  await expect(page.getByTestId('mission-hint')).toBeHidden();
  await page.getByTestId('ask-hint').click();
  await expect(page.getByTestId('mission-hint')).toBeVisible();
});

test('le niveau Expert donne un bonus à qui réussit sans boussole', async ({ page }) => {
  await createProfile(page, 'expert');
  await page.getByTestId('open-settings').click();
  await page.getByTestId('toggle-noMovement').check();
  await page.getByRole('button', { name: 'Retour' }).click();
  await page.getByTestId('mode-missions').click();
  await page.getByTestId('mission-find-landlocked').getByRole('button').click();
  await page.getByTestId('svg-country-select').selectOption('MLI');
  await expect(page.getByTestId('mission-success')).toContainText('+150 points');
});

test('une question de forme se joue au clavier et finit sur un récapitulatif', async ({ page }) => {
  await createProfile(page, 'geographer');
  await seed(page, { leitner: { 'shape-of:MDG': { box: 1, dueDay: 0 } } });
  await expect(page.getByTestId('reviews-due')).toHaveAttribute('data-count', '1');
  await expect(page.getByTestId('reviews-due')).toContainText('1 révision');
  await page.getByTestId('mode-quiz').click();
  await expect(page.getByTestId('quiz-question')).toHaveAttribute('data-item', 'shape-of:MDG');
  const shape = await page.getByTestId('quiz-shape').boundingBox();
  expect(shape?.height).toBeGreaterThan(50);
  const options = page.getByTestId('quiz-option');
  const count = await options.count();
  let wrong = 0;
  for (let index = 0; index < count; index += 1) {
    if ((await options.nth(index).getAttribute('data-correct')) === null) {
      wrong = index;
      break;
    }
  }
  await page.keyboard.press(String(wrong + 1));
  await expect(page.getByTestId('quiz-feedback')).toContainText('Madagascar');
  await expect(page.getByTestId('quiz-next')).toBeFocused();
  for (let index = 0; index < 4; index += 1) {
    await page.getByTestId('quiz-next').click();
    await page.locator('[data-testid="quiz-option"][data-correct="true"]').click();
  }
  await page.getByTestId('quiz-next').click();
  await expect(page.getByTestId('quiz-recap')).toContainText('Madagascar');
});

test('l’atlas de l’accueil s’allume pays par pays et montre le prochain objectif', async ({
  page,
}) => {
  await createProfile(page);
  await seed(page, { stamps: { SEN: '2026-11-01', ZAF: '2026-11-01' } });
  const atlas = page.getByTestId('atlas-map');
  await expect(atlas.locator('[data-code="SEN"]')).toHaveAttribute('data-lit', 'true');
  await expect(atlas.locator('[data-code="KEN"]')).toHaveAttribute('data-lit', 'false');
  await expect(page.getByTestId('home-progress')).toHaveAttribute('data-percent', '4');
  await expect(page.getByText('prochain badge : Afrique australe (1/5)')).toBeVisible();
});

test('le défi du jour donne une série et un résultat à copier', async ({ page, context }) => {
  const guards = watchPage(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await createProfile(page);
  await page.getByTestId('open-settings').click();
  await page.getByTestId('toggle-noMovement').check();
  await page.getByRole('button', { name: 'Retour' }).click();
  await page.getByTestId('mode-daily').click();
  const banner = page.getByTestId('mission-banner');
  await expect(banner).toBeVisible();
  const mission = (await banner.getAttribute('data-mission'))!;
  // La mission change chaque jour : le test accomplit celle du jour, quelle qu'elle soit.
  if (mission.startsWith('go:')) {
    await page.getByTestId(`svg-place-${mission.slice(3)}`).dispatchEvent('click');
  } else if (mission.startsWith('river:')) {
    await page.getByTestId(`svg-river-${mission.slice(6)}`).dispatchEvent('click');
  } else {
    await page.getByTestId('svg-country-select').selectOption('MLI');
  }
  const success = page.getByTestId('mission-success');
  await expect(success).toBeVisible();
  await page.getByTestId('share-daily').click();
  await expect(page.getByTestId('share-daily')).toHaveText('Résultat copié !');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toMatch(/^Tembea · Défi du \d{4}-\d{2}-\d{2} · \d+ points en \d+ s$/);
  await success.getByRole('button', { name: 'Continuer à voyager' }).click();
  await page.getByTestId('hud-menu').click();
  await expect(page.getByTestId('daily-meta')).toContainText('série de 1 jour');
  expectClean(guards);
});

test('aucun niveau ni texte d’accueil ne mentionne un âge plafond', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('home-screen')).toContainText('dès 8 ans');
  await page.getByTestId('start').click();
  const setup = page.getByTestId('setup-screen');
  await expect(setup).toContainText('Expert');
  await expect(setup).not.toContainText(/\d+\s*[–-]\s*\d+ ans/);
});

test('un nouveau pays ouvre sa fiche même au pas rapide', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  await createProfile(page);
  await page.getByTestId('mode-explore').click();
  const hud = page.getByTestId('hud-country');
  await expect(hud).toHaveAttribute('data-code', 'CAF');
  await page.getByTestId('sprint-toggle').click();
  const walker = new Walker(page, isMobile(testInfo));
  await walker.walkUntil(goTowards(page, 16, 18.5), async () => {
    return (await hud.getAttribute('data-code')) === 'TCD';
  });
  await expect(page.getByTestId('card-name')).toHaveText('Tchad');
});
