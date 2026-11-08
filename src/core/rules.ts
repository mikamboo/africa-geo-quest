import { BOX_INTERVALS_DAYS, MAX_BOX } from './leitner';
import {
  MISSION_BASE_POINTS,
  PLACE_POINTS,
  QUIZ_POINTS_PER_ATTEMPT,
  QUIZ_POINTS_PER_CORRECT,
  STAMP_POINTS,
  UNAIDED_BONUS,
} from './scoring';
import { STORY_FINAL_POINTS, STORY_FIRST_TRY_BONUS, STORY_POINTS } from './stories';
import type { PlayMode } from './types';

/**
 * Source unique des règles affichées au joueur.
 *
 * Les valeurs chiffrées viennent des constantes du jeu : modifier un barème met les règles à jour
 * sans autre intervention. Les textes sont dans `rules.sections.<id>` (fr.json et en.json) et
 * reprennent chaque paramètre sous la forme `{{nom}}`. `tests/rules-content.test.ts` l'impose.
 */
export const RULE_SECTION_IDS = [
  'explore',
  'missions',
  'quiz',
  'daily',
  'stories',
  'levels',
  'score',
] as const;

export type RuleSectionId = (typeof RULE_SECTION_IDS)[number];

export interface RuleSection {
  id: RuleSectionId;
  /** Valeurs injectées dans le texte : chaque clé doit être utilisée, et seulement celles-là. */
  params: Readonly<Record<string, number>>;
}

export const RULE_SECTIONS: readonly RuleSection[] = [
  { id: 'explore', params: { placePoints: PLACE_POINTS, stampPoints: STAMP_POINTS } },
  { id: 'missions', params: { points: MISSION_BASE_POINTS, unaidedBonus: UNAIDED_BONUS } },
  {
    id: 'quiz',
    params: {
      correctPoints: QUIZ_POINTS_PER_CORRECT,
      attemptPoints: QUIZ_POINTS_PER_ATTEMPT,
      boxes: MAX_BOX,
      maxDays: Math.max(...BOX_INTERVALS_DAYS),
    },
  },
  { id: 'daily', params: {} },
  {
    id: 'stories',
    params: {
      stopPoints: STORY_POINTS,
      firstTryBonus: STORY_FIRST_TRY_BONUS,
      finalPoints: STORY_FINAL_POINTS,
    },
  },
  { id: 'levels', params: {} },
  { id: 'score', params: {} },
];

/** Chaque mode de jeu renvoie à sa section : un mode ajouté sans règles ne compile plus. */
export const MODE_RULES: Readonly<Record<PlayMode | 'stories', RuleSectionId>> = {
  free: 'explore',
  mission: 'missions',
  daily: 'daily',
  stories: 'stories',
};

/** Boutons de l'accueil (`data-testid="mode-<clé>"`) et section qu'ils expliquent. */
export const HOME_MODE_RULES: Readonly<Record<string, RuleSectionId>> = {
  explore: 'explore',
  missions: 'missions',
  quiz: 'quiz',
  daily: 'daily',
  stories: 'stories',
};
