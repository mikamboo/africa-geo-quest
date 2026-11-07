import { expect, test, type Page } from '@playwright/test';
import { createProfile, expectClean, followHint, isMobile, Walker, watchPage } from './helpers';

const FIRST_STORY = 'son';

async function clickPlay(page: Page) {
  await page.getByTestId('mode-explore').click();
  await expect(page.getByTestId('game-canvas')).toBeVisible();
}

/** Marche vers un point d'action avec un balayage simple, jusqu'à ce que l'invite apparaisse. */
async function walkToSpot(page: Page, walker: Walker, kind: string) {
  const prompt = page.locator(`[data-testid="room-prompt"][data-kind="${kind}"]`);
  // Serpentin dans la pièce : les meubles font glisser, la cadence d'image varie selon la machine.
  const moves: [number, number][] = [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
    [0, 1],
  ];
  for (let lap = 0; lap < 4; lap += 1) {
    for (const [dx, dy] of moves) {
      await walker.start(dx, dy);
      const started = Date.now();
      while (Date.now() - started < 2600) {
        if (await prompt.isVisible()) {
          await walker.stop();
          return;
        }
        await page.waitForTimeout(80);
      }
      await walker.stop();
    }
  }
  throw new Error(`Invite introuvable : ${kind}`);
}

test('entrer dans un lieu change de contexte, et on en ressort', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const guards = watchPage(page);
  await createProfile(page);
  await clickPlay(page);
  await page.getByRole('button', { name: 'Fermer la fiche' }).click();
  await page.getByTestId('enter-place').click();
  await expect(page.getByTestId('room-bar')).toBeVisible();
  await expect(page.getByTestId('room-name')).toHaveText('Bangui');
  await expect(page.getByTestId('hud-country')).toBeHidden();
  await expect(page.getByTestId('minimap')).toBeHidden();

  const walker = new Walker(page, isMobile(testInfo));
  await walkToSpot(page, walker, 'lead');
  await page.getByTestId('room-prompt').click();
  const dialogue = page.getByTestId('dialogue');
  await expect(dialogue).toBeVisible();
  await page.getByTestId('dialogue-next').click();
  // Le fait du pays puis la question : tout est jouable sans sanction.
  if (await page.getByTestId('dialogue-next').isVisible()) {
    await page.getByTestId('dialogue-next').click();
  }
  await page.locator('[data-testid="dialogue-choice"][data-correct="true"]').click();
  await page.getByTestId('dialogue-next').click();
  await expect(dialogue).toBeHidden();

  await page.getByTestId('room-exit').click();
  await expect(page.getByTestId('room-bar')).toBeHidden();
  await expect(page.getByTestId('hud-country')).toBeVisible();
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  expectClean(guards);
});

test('la carte murale fait situer un pays, sans sanction', async ({ page }) => {
  await createProfile(page);
  await page.getByTestId('open-settings').click();
  await page.getByTestId('toggle-noMovement').check();
  await page.getByRole('button', { name: 'Retour' }).click();
  await page.getByTestId('mode-explore').click();
  await page.getByTestId('svg-place-sen-dakar').dispatchEvent('click');
  await page.getByTestId('enter-place').click();
  await page.getByTestId('room-action-map').click();
  const ask = page.getByTestId('wall-map-ask');
  await expect(ask).toBeVisible();
  const target = (await ask.getAttribute('data-target'))!;
  const wrong = target === 'ZAF' ? 'EGY' : 'ZAF';
  await page.getByTestId(`wall-${wrong}`).dispatchEvent('click');
  await expect(page.getByTestId('wall-map-result')).toContainText('Pas ici');
  await page.getByTestId(`wall-${target}`).dispatchEvent('click');
  await expect(page.getByTestId('wall-map-result')).toContainText('Exact');
});

test('un reportage complet se joue sur la carte à cliquer, jusqu’à la publication', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const guards = watchPage(page);
  await createProfile(page);
  await page.getByTestId('open-settings').click();
  await page.getByTestId('toggle-noMovement').check();
  await page.getByRole('button', { name: 'Retour' }).click();
  await page.getByTestId('mode-stories').click();
  await page.getByTestId(`story-start-${FIRST_STORY}`).click();
  const banner = page.getByTestId('story-banner');
  for (let stop = 0; stop < 3; stop += 1) {
    await expect(banner).toBeVisible();
    const target = (await banner.getAttribute('data-target'))!;
    await page.getByTestId(`svg-place-${target}`).dispatchEvent('click');
    await page.getByTestId('enter-place').click();
    await page.getByTestId('room-action-lead').click();
    while (await page.getByTestId('dialogue-next').isVisible()) {
      await page.getByTestId('dialogue-next').click();
      if (await page.getByTestId('dialogue-choice').first().isVisible()) break;
    }
    // Une mauvaise réponse à la première étape : l'histoire continue quand même.
    const selector =
      stop === 0
        ? '[data-testid="dialogue-choice"]:not([data-correct])'
        : '[data-testid="dialogue-choice"][data-correct="true"]';
    await page.locator(selector).first().click();
    if (stop === 0)
      await expect(page.getByTestId('dialogue-text')).toContainText('Pas tout à fait');
    await page.getByTestId('dialogue-next').click();
    await page.getByTestId('dialogue-next').click();
    if (stop < 2) await page.getByTestId('room-exit').click();
  }
  const publication = page.getByTestId('publication');
  await expect(publication).toBeVisible();
  await expect(publication).toContainText('Tembea Mag');
  await publication.getByRole('button', { name: 'Voir les reportages' }).click();
  await expect(page.getByTestId(`story-${FIRST_STORY}`)).toContainText('Publié');
  await expect(page.getByTestId('notebook').locator('li')).toHaveCount(3);
  await page.reload();
  await page.getByTestId('mode-stories').click();
  // Sous SwiftShader, la page peut geler une trentaine de secondes juste après un rechargement.
  // Hors rendu logiciel, le même parcours prend environ une seconde (voir docs/BLOCKERS.md).
  await expect
    .poll(() => page.getByTestId(`story-${FIRST_STORY}`).count(), { timeout: 60_000 })
    .toBe(1);
  expect(await page.getByTestId(`story-${FIRST_STORY}`).innerText()).toContain('Publié');
  expectClean(guards);
});

test('un reportage se suit à pied, avec l’indice et la boussole', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await createProfile(page);
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('tembea.progress')!);
    // Départ à quelques centaines de kilomètres de Kinshasa, première étape.
    save.lastPosition = { x: -500, y: 400 };
    localStorage.setItem('tembea.progress', JSON.stringify(save));
  });
  await page.reload();
  await page.getByTestId('mode-stories').click();
  await page.getByTestId(`story-start-${FIRST_STORY}`).click();
  await expect(page.getByTestId('story-clue')).toBeVisible();
  await page.getByTestId('sprint-toggle').click();
  const enter = page.getByTestId('enter-place');
  const walker = new Walker(page, isMobile(testInfo));
  const target = (await page.getByTestId('story-banner').getAttribute('data-target'))!;
  await walker.walkUntil(followHint(page), async () => {
    if (!(await enter.isVisible())) return false;
    const text = (await enter.textContent()) ?? '';
    return target.includes('kinshasa') ? text.includes('Kinshasa') : true;
  });
  await enter.click();
  await expect(page.getByTestId('room-bar')).toHaveAttribute('data-theme', /.+/);
});

test('une ancienne sauvegarde garde sa progression et perd son animal', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'tembea.progress',
      JSON.stringify({
        version: 1,
        profile: { avatar: 'zola', pseudonym: { animal: 'gazelle', adjective: 'curious' } },
        level: 'geographer',
        stamps: { SEN: '2026-11-01' },
        discoveredPlaces: [],
        crossedRivers: [],
        leitner: {},
        missionsCompleted: 3,
        quizCorrect: 0,
        quizAnswered: 0,
        points: 42,
        lastPosition: null,
      }),
    );
  });
  await page.reload();
  await expect(page.getByTestId('recovered-notice')).toBeHidden();
  await expect(page.getByTestId('profile-name')).toHaveText('Cartographe lucide');
  await expect(page.getByTestId('home-progress')).toHaveAttribute('data-percent', '2');
});
