import { capitalsOf, countryByCode, placesForLevel, type GameCatalog } from './catalog';
import { dueItems } from './leitner';
import type { ProgressData } from './progress';
import { pick, shuffle, type Rng } from './rng';
import type { Level } from './types';

export type QuestionKind =
  | 'capital-of'
  | 'country-of-capital'
  | 'flag-of'
  | 'region-of'
  | 'city-in'
  | 'shape-of'
  | 'borders'
  | 'landlocked';

export interface QuizOption {
  id: string;
}

export interface QuizQuestion {
  /** Identifiant de carte Leitner : `genre:sujet`. */
  itemId: string;
  kind: QuestionKind;
  /** Pays ou lieu sur lequel porte la question. */
  subject: string;
  options: string[];
  answer: string;
}

const EXPLORER_KINDS: QuestionKind[] = ['capital-of', 'country-of-capital', 'flag-of'];
const GEOGRAPHER_KINDS: QuestionKind[] = [
  ...EXPLORER_KINDS,
  'region-of',
  'city-in',
  'borders',
  'landlocked',
  'shape-of',
];

const REGION_OPTIONS = ['north', 'west', 'central', 'east', 'south'];

export function optionCount(level: Level, box: number): number {
  if (level === 'expert') return 5;
  if (level === 'geographer') return 4;
  return box >= 3 ? 4 : 3;
}

function distractors(rng: Rng, pool: string[], answer: string, count: number): string[] {
  return shuffle(
    rng,
    pool.filter((id) => id !== answer),
  ).slice(0, count);
}

/** Au niveau Expert, les pièges viennent de la même région : la question devient vraiment difficile. */
function countryDistractors(
  rng: Rng,
  catalog: GameCatalog,
  level: Level,
  answer: string,
  count: number,
): string[] {
  const codes = catalog.countries.map((country) => country.code);
  if (level !== 'expert') return distractors(rng, codes, answer, count);
  const region = countryByCode(catalog, answer)?.region;
  const sameRegion = catalog.countries.filter((c) => c.region === region).map((c) => c.code);
  const near = distractors(rng, sameRegion, answer, count);
  const taken = new Set([answer, ...near]);
  const rest = distractors(
    rng,
    codes.filter((code) => !taken.has(code)),
    answer,
    count - near.length,
  );
  return [...near, ...rest];
}

function withOptions(rng: Rng, answer: string, others: string[]): string[] {
  return shuffle(rng, [answer, ...others]);
}

/** Construit une question depuis son identifiant, ou `null` si elle n'a plus de sens. */
export function buildQuestion(
  rng: Rng,
  itemId: string,
  catalog: GameCatalog,
  level: Level,
  box = 0,
): QuizQuestion | null {
  const separator = itemId.indexOf(':');
  const kind = itemId.slice(0, separator) as QuestionKind;
  const subject = itemId.slice(separator + 1);
  const count = optionCount(level, box) - 1;
  const codes = catalog.countries.map((country) => country.code);

  switch (kind) {
    case 'capital-of': {
      const capital = capitalsOf(catalog, subject)[0];
      if (!capital) return null;
      const pool = catalog.countries
        .map((country) => capitalsOf(catalog, country.code)[0]?.id)
        .filter((id): id is string => Boolean(id));
      return {
        itemId,
        kind,
        subject,
        answer: capital.id,
        options: withOptions(rng, capital.id, distractors(rng, pool, capital.id, count)),
      };
    }
    case 'country-of-capital':
    case 'flag-of':
    case 'shape-of': {
      if (!countryByCode(catalog, subject)) return null;
      return {
        itemId,
        kind,
        subject,
        answer: subject,
        options: withOptions(rng, subject, countryDistractors(rng, catalog, level, subject, count)),
      };
    }
    case 'region-of': {
      const country = countryByCode(catalog, subject);
      if (!country) return null;
      return {
        itemId,
        kind,
        subject,
        answer: country.region,
        options: withOptions(
          rng,
          country.region,
          distractors(rng, REGION_OPTIONS, country.region, count),
        ),
      };
    }
    case 'city-in': {
      const place = catalog.places.find((candidate) => candidate.id === subject);
      if (!place) return null;
      return {
        itemId,
        kind,
        subject,
        answer: place.country,
        options: withOptions(rng, place.country, distractors(rng, codes, place.country, count)),
      };
    }
    case 'borders': {
      const neighbors = (catalog.neighbors[subject] ?? []).filter((code) => codes.includes(code));
      if (neighbors.length === 0) return null;
      const answer = pick(rng, neighbors);
      const pool = codes.filter((code) => code !== subject && !neighbors.includes(code));
      return {
        itemId,
        kind,
        subject,
        answer,
        options: withOptions(rng, answer, distractors(rng, pool, answer, count)),
      };
    }
    case 'landlocked': {
      const country = countryByCode(catalog, subject);
      if (!country?.landlocked) return null;
      const coastal = catalog.countries.filter((c) => !c.landlocked).map((c) => c.code);
      return {
        itemId,
        kind,
        subject,
        answer: subject,
        options: withOptions(rng, subject, distractors(rng, coastal, subject, count)),
      };
    }
    default:
      return null;
  }
}

function itemsForCountry(code: string, level: Level, catalog: GameCatalog): string[] {
  const kinds = level === 'explorer' ? EXPLORER_KINDS : GEOGRAPHER_KINDS;
  const items: string[] = [];
  for (const kind of kinds) {
    if (kind === 'city-in') continue;
    if (kind === 'landlocked' && !countryByCode(catalog, code)?.landlocked) continue;
    if (kind === 'borders' && (catalog.neighbors[code] ?? []).length === 0) continue;
    items.push(`${kind}:${code}`);
  }
  return items;
}

/**
 * Compose un quiz depuis la progression : d'abord les cartes à revoir, puis les pays visités,
 * puis le reste. Un joueur qui débute a donc des questions sur ce qu'il vient de voir.
 */
export function generateQuiz(
  rng: Rng,
  catalog: GameCatalog,
  progress: Pick<ProgressData, 'stamps' | 'leitner' | 'level' | 'discoveredPlaces'>,
  today: number,
  count = 5,
): QuizQuestion[] {
  const { level } = progress;
  const due = dueItems(progress.leitner, today);
  const visited = Object.keys(progress.stamps).filter((code) => countryByCode(catalog, code));
  const unseen = (item: string): boolean => !progress.leitner[item];
  const visitedItems = shuffle(
    rng,
    visited.flatMap((code) => itemsForCountry(code, level, catalog)),
  ).filter(unseen);
  const cityItems =
    level !== 'explorer'
      ? shuffle(
          rng,
          placesForLevel(catalog, level)
            .filter((place) => progress.discoveredPlaces.includes(place.id))
            .map((place) => `city-in:${place.id}`),
        ).filter(unseen)
      : [];
  const others = shuffle(
    rng,
    catalog.countries.flatMap((country) => itemsForCountry(country.code, level, catalog)),
  ).filter(unseen);

  const seen = new Set<string>();
  const questions: QuizQuestion[] = [];
  const subjects = new Set<string>();
  for (const item of [...due, ...visitedItems, ...cityItems, ...others]) {
    if (questions.length >= count) break;
    if (seen.has(item)) continue;
    seen.add(item);
    const subject = item.slice(item.indexOf(':') + 1);
    if (subjects.has(subject)) continue;
    const question = buildQuestion(rng, item, catalog, level, progress.leitner[item]?.box ?? 0);
    if (question) {
      questions.push(question);
      subjects.add(subject);
    }
  }
  return questions;
}
