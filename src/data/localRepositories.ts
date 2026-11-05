import { z } from 'zod/mini';
import {
  createInitialProgress,
  PROGRESS_VERSION,
  AVATAR_IDS,
  type ProgressData,
} from '../core/progress';
import { isValidPseudonym } from '../core/pseudonyms';
import type {
  DailyScore,
  LoadResult,
  ProgressRepository,
  ScoreRepository,
} from '../core/repositories';

const LEVELS = ['explorer', 'geographer'] as const;

export const PROGRESS_KEY = 'tembea.progress';
export const SCORES_KEY = 'tembea.scores';
export const SETTINGS_KEY = 'tembea.settings';

const nonNegativeInt = z.int().check(z.minimum(0));

const progressSchema = z.object({
  version: z.literal(PROGRESS_VERSION),
  profile: z.nullable(
    z.object({
      avatar: z.enum(AVATAR_IDS),
      pseudonym: z
        .object({ animal: z.string(), adjective: z.string() })
        .check(z.refine(isValidPseudonym, 'Pseudonyme hors liste')),
    }),
  ),
  level: z.enum(LEVELS),
  stamps: z.record(z.string(), z.string()),
  discoveredPlaces: z.array(z.string()),
  crossedRivers: z.array(z.string()),
  leitner: z.record(z.string(), z.object({ box: z.int().check(z.minimum(1)), dueDay: z.int() })),
  missionsCompleted: nonNegativeInt,
  quizCorrect: nonNegativeInt,
  quizAnswered: nonNegativeInt,
  points: z.number().check(z.minimum(0)),
  lastPosition: z.nullable(z.object({ x: z.number(), y: z.number() })),
});

const dailyScoresSchema = z.array(
  z.object({ dateKey: z.string(), score: z.number(), seconds: z.number() }),
);

/** `localStorage` peut lever une exception (mode privé, quota) : le jeu continue sans sauvegarder. */
function readItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Sauvegarde locale impossible', error);
  }
}

function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Effacement local impossible', error);
  }
}

export class LocalProgressRepository implements ProgressRepository {
  load(): LoadResult<ProgressData> {
    const raw = readItem(PROGRESS_KEY);
    if (raw === null) return { value: createInitialProgress(), recovered: false };
    try {
      return { value: progressSchema.parse(JSON.parse(raw)), recovered: false };
    } catch {
      removeItem(PROGRESS_KEY);
      return { value: createInitialProgress(), recovered: true };
    }
  }

  save(progress: ProgressData): void {
    writeItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  clear(): void {
    removeItem(PROGRESS_KEY);
  }
}

export class LocalScoreRepository implements ScoreRepository {
  loadDailyScores(): DailyScore[] {
    const raw = readItem(SCORES_KEY);
    if (raw === null) return [];
    try {
      return dailyScoresSchema.parse(JSON.parse(raw));
    } catch {
      removeItem(SCORES_KEY);
      return [];
    }
  }

  recordDaily(score: DailyScore): DailyScore {
    const scores = this.loadDailyScores();
    const existing = scores.find((entry) => entry.dateKey === score.dateKey);
    if (existing && existing.score >= score.score) return existing;
    const next = [...scores.filter((entry) => entry.dateKey !== score.dateKey), score];
    writeItem(SCORES_KEY, JSON.stringify(next));
    return score;
  }

  clear(): void {
    removeItem(SCORES_KEY);
  }
}

export const settingsSchema = z.object({
  locale: z._default(z.enum(['fr', 'en']), 'fr'),
  muted: z._default(z.boolean(), false),
  dyslexia: z._default(z.boolean(), false),
  reduceMotion: z._default(z.boolean(), false),
  noMovement: z._default(z.boolean(), false),
  timer: z._default(z.boolean(), false),
});
export type Settings = z.infer<typeof settingsSchema>;

export function loadSettings(): Settings {
  const raw = readItem(SETTINGS_KEY);
  if (raw !== null) {
    try {
      return settingsSchema.parse(JSON.parse(raw));
    } catch {
      removeItem(SETTINGS_KEY);
    }
  }
  return settingsSchema.parse({});
}

export function saveSettings(settings: Settings): void {
  writeItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function clearSettings(): void {
  removeItem(SETTINGS_KEY);
}
