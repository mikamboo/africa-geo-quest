import type { Level, Locale } from './types';

/**
 * Contribution guidée (ADR 0009) : uniquement des valeurs fermées, aucune saisie libre.
 * Le jeu ne transmet rien : il construit un lien GitHub pré-rempli ou un résumé à copier.
 */

export const FEEDBACK_REPO = 'mikamboo/africa-geo-quest';

export const FEEDBACK_CATEGORIES = [
  'fact-wrong',
  'map',
  'translation',
  'too-hard',
  'too-easy',
  'bug',
  'idea',
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_SCREENS = ['map', 'country-card', 'quiz', 'parents'] as const;
export type FeedbackScreen = (typeof FEEDBACK_SCREENS)[number];

/** Formulaires GitHub (`.github/ISSUE_TEMPLATE/`), un par famille de retours. */
export const FEEDBACK_TEMPLATES = {
  fact: 'fait-errone.yml',
  translation: 'contenu-traduction.yml',
  difficulty: 'difficulte.yml',
  bug: 'bug.yml',
  idea: 'idee.yml',
} as const;
export type FeedbackTemplateKey = keyof typeof FEEDBACK_TEMPLATES;

const TEMPLATE_OF: Record<FeedbackCategory, FeedbackTemplateKey> = {
  'fact-wrong': 'fact',
  map: 'fact',
  translation: 'translation',
  'too-hard': 'difficulty',
  'too-easy': 'difficulty',
  bug: 'bug',
  idea: 'idea',
};

const CATEGORIES_BY_SCREEN: Record<FeedbackScreen, readonly FeedbackCategory[]> = {
  // Ordre d'affichage : ce que le joueur apporte d'abord, les problèmes en dernier.
  map: ['idea', 'fact-wrong', 'map', 'translation', 'bug'],
  'country-card': ['idea', 'fact-wrong', 'map', 'translation', 'bug'],
  quiz: ['too-hard', 'too-easy', 'fact-wrong', 'translation', 'bug'],
  parents: ['idea', 'fact-wrong', 'map', 'translation', 'bug'],
};

/** Identifiants des champs des formulaires, communs à tous les modèles. */
export const FEEDBACK_FIELDS = [
  'category',
  'country',
  'question',
  'screen',
  'locale',
  'level',
  'version',
] as const;
export type FeedbackField = (typeof FEEDBACK_FIELDS)[number];

/** Limite prudente : les navigateurs et GitHub tronquent au-delà de ~8 000 caractères. */
export const MAX_URL_LENGTH = 2_000;

const COUNTRY_PATTERN = /^[A-Z]{3}$/;
const QUESTION_PATTERN = /^[a-z-]{1,32}:[A-Za-z0-9_-]{1,64}$/;
const VERSION_PATTERN = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
const LOCALES: readonly Locale[] = ['fr', 'en'];
const LEVELS: readonly Level[] = ['explorer', 'geographer', 'expert'];

export interface FeedbackContext {
  screen: FeedbackScreen;
  locale: Locale;
  level: Level;
  appVersion: string;
  /** Code ISO A3 du pays concerné, s'il y en a un. */
  country?: string;
  /** Identifiant de question (`genre:sujet`), s'il y en a une. */
  questionId?: string;
}

export interface FeedbackReport extends FeedbackContext {
  category: FeedbackCategory;
}

export class FeedbackError extends Error {
  override name = 'FeedbackError';
}

export function categoriesFor(screen: FeedbackScreen): readonly FeedbackCategory[] {
  return CATEGORIES_BY_SCREEN[screen];
}

export function templateFor(category: FeedbackCategory): string {
  return FEEDBACK_TEMPLATES[TEMPLATE_OF[category]];
}

function oneOf<T extends string>(value: string, allowed: readonly T[], name: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new FeedbackError(`${name} invalide : ${value}`);
  }
  return value as T;
}

function matching(value: string | undefined, pattern: RegExp, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (!pattern.test(value)) throw new FeedbackError(`${name} invalide : ${value}`);
  return value;
}

/**
 * Valide le contexte et le choix. Toute valeur hors des listes fermées est refusée :
 * c'est la garantie qu'aucun texte arbitraire ne quitte le jeu.
 */
export function buildReport(context: FeedbackContext, category: string): FeedbackReport {
  const screen = oneOf(context.screen, FEEDBACK_SCREENS, 'écran');
  const checked = oneOf(category, categoriesFor(screen), 'catégorie');
  const report: FeedbackReport = {
    category: checked,
    screen,
    locale: oneOf(context.locale, LOCALES, 'langue'),
    level: oneOf(context.level, LEVELS, 'niveau'),
    appVersion: matching(context.appVersion, VERSION_PATTERN, 'version') ?? '',
  };
  const country = matching(context.country, COUNTRY_PATTERN, 'pays');
  const questionId = matching(context.questionId, QUESTION_PATTERN, 'question');
  if (country) report.country = country;
  if (questionId) report.questionId = questionId;
  return report;
}

/** Champs du formulaire, dans l'ordre d'affichage. Les champs absents sont omis. */
export function reportFields(report: FeedbackReport): [FeedbackField, string][] {
  const fields: [FeedbackField, string | undefined][] = [
    ['category', report.category],
    ['country', report.country],
    ['question', report.questionId],
    ['screen', report.screen],
    ['locale', report.locale],
    ['level', report.level],
    ['version', report.appVersion],
  ];
  return fields.filter((entry): entry is [FeedbackField, string] => Boolean(entry[1]));
}

/** Titre de l'issue : catégorie et sujet, sans aucun texte saisi. */
export function issueTitle(report: FeedbackReport): string {
  const subject = report.questionId ?? report.country ?? report.screen;
  return `[${report.category}] ${subject}`;
}

/** Lien de création d'issue pré-rempli (paramètres d'URL des Issue Forms). */
export function toIssueUrl(report: FeedbackReport): string {
  const params = new URLSearchParams({
    template: templateFor(report.category),
    title: issueTitle(report),
  });
  for (const [field, value] of reportFields(report)) params.set(field, value);
  const url = `https://github.com/${FEEDBACK_REPO}/issues/new?${params.toString()}`;
  if (url.length > MAX_URL_LENGTH) throw new FeedbackError('lien de contribution trop long');
  return url;
}
