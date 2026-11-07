import type { Pseudonym } from './progress';
import { shuffle, type Rng } from './rng';

/**
 * Listes fermées : aucune saisie libre n'est possible (section 6).
 * Des métiers et des qualités : un joueur n'est jamais assimilé à un animal.
 * Tous les mots sont épicènes en français, pour n'assigner aucun genre.
 */
export const ROLES = [
  'cartographer',
  'astronomer',
  'architect',
  'pilot',
  'poet',
  'journalist',
  'librarian',
  'filmmaker',
  'photographer',
  'archivist',
  'chemist',
  'geologist',
] as const;

export const ADJECTIVES = [
  'fast',
  'calm',
  'skilled',
  'wise',
  'agile',
  'lucid',
  'loyal',
  'tenacious',
] as const;

export function isValidPseudonym(pseudonym: Pseudonym): boolean {
  return (
    (ROLES as readonly string[]).includes(pseudonym.role) &&
    (ADJECTIVES as readonly string[]).includes(pseudonym.adjective)
  );
}

export function generatePseudonyms(rng: Rng, count: number): Pseudonym[] {
  const roles = shuffle(rng, ROLES);
  const adjectives = shuffle(rng, ADJECTIVES);
  return Array.from({ length: Math.min(count, roles.length) }, (_, index) => ({
    role: roles[index]!,
    adjective: adjectives[index % adjectives.length]!,
  }));
}

/** Sauvegardes v1 : remplace les anciens pseudonymes (animaux) sans perdre la progression. */
const LEGACY_ROLES: Record<string, string> = {
  gazelle: 'cartographer',
  lion: 'astronomer',
  elephant: 'architect',
  giraffe: 'pilot',
  zebra: 'poet',
  okapi: 'journalist',
  hippo: 'librarian',
  pangolin: 'filmmaker',
  ibis: 'photographer',
  turtle: 'archivist',
  fennec: 'chemist',
  meerkat: 'geologist',
};
const LEGACY_ADJECTIVES: Record<string, string> = {
  fast: 'fast',
  curious: 'lucid',
  brave: 'tenacious',
  clever: 'skilled',
  calm: 'calm',
  joyful: 'agile',
  patient: 'wise',
  bold: 'loyal',
};

export function migrateLegacyPseudonym(animal: string, adjective: string): Pseudonym | null {
  const role = LEGACY_ROLES[animal];
  const newAdjective = LEGACY_ADJECTIVES[adjective];
  return role && newAdjective ? { role, adjective: newAdjective } : null;
}
