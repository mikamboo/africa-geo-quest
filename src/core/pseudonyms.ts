import type { Pseudonym } from './progress';
import { shuffle, type Rng } from './rng';

/** Listes fermées : aucune saisie libre n'est possible (section 6). */
export const ANIMALS = [
  'gazelle',
  'lion',
  'elephant',
  'giraffe',
  'zebra',
  'okapi',
  'hippo',
  'pangolin',
  'ibis',
  'turtle',
  'fennec',
  'meerkat',
] as const;

export const ADJECTIVES = [
  'fast',
  'curious',
  'brave',
  'clever',
  'calm',
  'joyful',
  'patient',
  'bold',
] as const;

export function isValidPseudonym(pseudonym: Pseudonym): boolean {
  return (
    (ANIMALS as readonly string[]).includes(pseudonym.animal) &&
    (ADJECTIVES as readonly string[]).includes(pseudonym.adjective)
  );
}

export function generatePseudonyms(rng: Rng, count: number): Pseudonym[] {
  const animals = shuffle(rng, ANIMALS);
  const adjectives = shuffle(rng, ADJECTIVES);
  return Array.from({ length: Math.min(count, animals.length) }, (_, index) => ({
    animal: animals[index]!,
    adjective: adjectives[index % adjectives.length]!,
  }));
}
