import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createProfile, expectClean, watchPage } from './helpers';

/** Signalement guidé (ADR 0009) : choix fermés, lien sortant averti, aucune requête du jeu. */

/** Remplace `window.open` pour lire l'URL sans ouvrir d'onglet ni contacter GitHub. */
async function recordOpens(page: Page): Promise<void> {
  await page.evaluate(() => {
    const opened: string[] = [];
    (window as unknown as { __opened: string[] }).__opened = opened;
    window.open = (url?: string | URL) => {
      opened.push(String(url));
      return null;
    };
  });
}

const openedUrls = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);

test('la page À propos prépare une contribution sans saisie libre ni requête', async ({
  page,
  context,
}) => {
  const guards = watchPage(page);
  await createProfile(page, 'geographer');
  await page.getByTestId('open-parents').click();
  await expect(page.getByTestId('parents-contribute')).toBeVisible();
  await page.getByTestId('parents-contribute').getByTestId('feedback-open').click();

  const dialog = page.getByTestId('feedback-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('input, textarea, [contenteditable]')).toHaveCount(0);
  await expect(page.getByTestId('feedback-send')).toBeHidden();

  await page.getByTestId('feedback-bug').click();
  await expect(page.getByTestId('feedback-bug')).toHaveAttribute('aria-pressed', 'true');
  const axe = await new AxeBuilder({ page }).include('[data-testid="feedback-dialog"]').analyze();
  const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((violation) => violation.id)).toEqual([]);
  await recordOpens(page);
  await page.getByTestId('feedback-github').click();
  await expect(page.getByTestId('external-warning')).toBeVisible();
  await expect(page.getByTestId('external-host')).toHaveText('github.com');

  // Échap ferme l'avertissement seul : la contribution reste ouverte.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('external-warning')).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.getByTestId('feedback-github').click();
  await page.getByTestId('external-continue').click();
  const [url] = await openedUrls(page);
  const parsed = new URL(url!);
  expect(parsed.host).toBe('github.com');
  expect(parsed.pathname).toBe('/mikamboo/africa-geo-quest/issues/new');
  expect(Object.fromEntries(parsed.searchParams)).toEqual({
    template: 'bug.yml',
    title: '[bug] parents',
    category: 'bug',
    screen: 'parents',
    locale: 'fr',
    level: 'geographer',
    version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
  });
  expect(context.pages()).toHaveLength(1);

  await page.getByTestId('feedback-close').click();
  await expect(dialog).toBeHidden();
  expectClean(guards);
});

test('le quiz copie un résumé pour un adulte', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await createProfile(page);
  await page.getByTestId('mode-quiz').click();
  const question = page.getByTestId('quiz-question');
  await expect(question).toBeVisible();
  const itemId = await question.getAttribute('data-item');
  await page.getByTestId('quiz-option').first().click();
  await page.getByTestId('quiz-feedback').getByTestId('feedback-open').click();
  await page.getByTestId('feedback-too-hard').click();
  await page.getByTestId('feedback-copy').click();
  await expect(page.getByTestId('feedback-copy-status')).toContainText('Copié');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Contribution à Tembea');
  expect(copied).toContain("Catégorie : C'était trop dur");
  expect(copied).toContain(`Question : ${itemId}`);
  expect(copied).toContain('https://github.com/mikamboo/africa-geo-quest/issues/new?');
});

test('la fiche pays propose de contribuer et reste ouverte pendant', async ({ page }) => {
  await createProfile(page);
  await page.getByTestId('mode-explore').click();
  const card = page.getByTestId('country-card');
  await expect(card).toBeVisible({ timeout: 30_000 });
  const code = await card.getAttribute('data-code');
  await card.getByTestId('feedback-open').click();
  await page.getByTestId('feedback-fact-wrong').click();
  await recordOpens(page);
  await page.getByTestId('feedback-github').click();
  await page.getByTestId('external-continue').click();
  const [url] = await openedUrls(page);
  expect(new URL(url!).searchParams.get('country')).toBe(code);
  expect(new URL(url!).searchParams.get('template')).toBe('fait-errone.yml');
  await page.getByTestId('feedback-close').click();
  await expect(card).toBeVisible();
});
