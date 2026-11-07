import { z } from 'zod/mini';
import {
  createInitialProgress,
  PROGRESS_VERSION,
  AVATAR_IDS,
  type ProgressData,
} from '../core/progress';
import { isValidPseudonym, migrateLegacyPseudonym } from '../core/pseudonyms';
import type {
  DailyScore,
  LoadResult,
  ProgressRepository,
  ScoreRepository,
} from '../core/repositories';

const LEVELS = ['explorer', 'geographer', 'expert'] as const;

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
        .object({ role: z.string(), adjective: z.string() })
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
  story: z.nullable(z.object({ id: z.string(), stop: nonNegativeInt })),
  storiesDone: z.array(z.string()),
  notes: z.array(z.string()),
  roomsVisited: z.array(z.string()),
});

interface LegacySave {
  version?: unknown;
  profile?: { avatar?: unknown; pseudonym?: { animal?: unknown; adjective?: unknown } } | null;
}

/** Mise à niveau en place : un joueur ne perd jamais sa progression à cause d'une nouvelle version. */
export function migrateProgress(raw: unknown): unknown {
  const save = raw as LegacySave | null;
  if (save?.version !== 1) return raw;
  const legacy = save.profile?.pseudonym;
  const pseudonym = legacy
    ? migrateLegacyPseudonym(String(legacy.animal), String(legacy.adjective))
    : null;
  // Un pseudonyme forgé reste invalide : la validation qui suit écartera la sauvegarde.
  const profile = save.profile
    ? { ...save.profile, pseudonym: pseudonym ?? { role: 'invalid', adjective: 'invalid' } }
    : null;
  return {
    ...save,
    version: PROGRESS_VERSION,
    profile,
    story: null,
    storiesDone: [],
    notes: [],
    roomsVisited: [],
  };
}

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
      const value = progressSchema.parse(migrateProgress(JSON.parse(raw)));
      return { value, recovered: false };
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
  seenTutorial: z._default(z.boolean(), false),
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
