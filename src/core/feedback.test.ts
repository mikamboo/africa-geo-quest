import { describe, expect, it } from 'vitest';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_REPO,
  FEEDBACK_SCREENS,
  FeedbackError,
  MAX_URL_LENGTH,
  buildReport,
  categoriesFor,
  issueTitle,
  reportFields,
  templateFor,
  toIssueUrl,
  type FeedbackContext,
} from './feedback';

const base: FeedbackContext = {
  screen: 'country-card',
  locale: 'fr',
  level: 'explorer',
  appVersion: '0.1.0',
  country: 'SEN',
};

describe('buildReport', () => {
  it('garde uniquement des valeurs fermées', () => {
    expect(buildReport(base, 'fact-wrong')).toEqual({
      category: 'fact-wrong',
      screen: 'country-card',
      locale: 'fr',
      level: 'explorer',
      appVersion: '0.1.0',
      country: 'SEN',
    });
  });

  it('accepte une question de quiz', () => {
    const report = buildReport(
      { ...base, screen: 'quiz', country: undefined, questionId: 'city-in:poi-giza' },
      'too-hard',
    );
    expect(report.questionId).toBe('city-in:poi-giza');
    expect(report.country).toBeUndefined();
  });

  it.each([
    ['catégorie hors écran', base, 'too-easy'],
    ['catégorie inconnue', base, 'insulte'],
    ['pays non conforme', { ...base, country: 'Sénégal' }, 'idea'],
    ['question avec du texte', { ...base, questionId: 'capital-of:SEN bonjour' }, 'idea'],
    ['version libre', { ...base, appVersion: 'v1 <script>' }, 'idea'],
    ['langue inconnue', { ...base, locale: 'de' as never }, 'idea'],
    ['niveau inconnu', { ...base, level: 'pro' as never }, 'idea'],
    ['écran inconnu', { ...base, screen: 'home' as never }, 'idea'],
  ])('refuse : %s', (_name, context, category) => {
    expect(() => buildReport(context, category)).toThrow(FeedbackError);
  });
});

describe('catégories', () => {
  it('chaque écran propose des catégories connues, chacune reliée à un modèle', () => {
    for (const screen of FEEDBACK_SCREENS) {
      const list = categoriesFor(screen);
      expect(list.length).toBeGreaterThan(2);
      for (const category of list) expect(FEEDBACK_CATEGORIES).toContain(category);
    }
    for (const category of FEEDBACK_CATEGORIES) expect(templateFor(category)).toMatch(/\.yml$/);
  });

  it('chaque catégorie est proposée sur au moins un écran', () => {
    const offered = new Set(FEEDBACK_SCREENS.flatMap((screen) => categoriesFor(screen)));
    expect([...offered].sort()).toEqual([...FEEDBACK_CATEGORIES].sort());
  });
});

describe('toIssueUrl', () => {
  it('pré-remplit le formulaire du bon modèle', () => {
    const url = new URL(toIssueUrl(buildReport(base, 'map')));
    expect(url.origin).toBe('https://github.com');
    expect(url.pathname).toBe(`/${FEEDBACK_REPO}/issues/new`);
    expect(url.searchParams.get('template')).toBe('fait-errone.yml');
    expect(url.searchParams.get('title')).toBe('[map] SEN');
    expect(url.searchParams.get('country')).toBe('SEN');
    expect(url.searchParams.get('question')).toBeNull();
    expect(url.searchParams.get('version')).toBe('0.1.0');
  });

  it('reste court pour le plus long contexte possible', () => {
    const report = buildReport(
      { ...base, screen: 'quiz', level: 'geographer', questionId: `shape-of:${'x'.repeat(64)}` },
      'translation',
    );
    expect(toIssueUrl(report).length).toBeLessThan(MAX_URL_LENGTH);
  });
});

describe('reportFields et issueTitle', () => {
  it('omettent les champs absents et titrent par le sujet le plus précis', () => {
    const report = buildReport({ ...base, screen: 'parents', country: undefined }, 'idea');
    expect(reportFields(report).map(([field]) => field)).toEqual([
      'category',
      'screen',
      'locale',
      'level',
      'version',
    ]);
    expect(issueTitle(report)).toBe('[idea] parents');
    expect(issueTitle({ ...report, questionId: 'flag-of:SEN', country: 'SEN' })).toBe(
      '[idea] flag-of:SEN',
    );
  });
});
