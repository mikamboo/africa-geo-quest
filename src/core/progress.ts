import { REGIONS, type GameCatalog } from './catalog';
import type { Point } from './geometry';
import type { LeitnerState } from './leitner';
import type { StoryProgress } from './stories';
import type { Level, RegionId } from './types';

export const PROGRESS_VERSION = 2;

export const AVATAR_IDS = ['amina', 'kofi', 'zola', 'idir'] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export interface Pseudonym {
  role: string;
  adjective: string;
}

export interface Profile {
  avatar: AvatarId;
  pseudonym: Pseudonym;
}

export interface ProgressData {
  version: number;
  profile: Profile | null;
  level: Level;
  /** Pays visités : code vers date du tampon (AAAA-MM-JJ). */
  stamps: Record<string, string>;
  discoveredPlaces: string[];
  crossedRivers: string[];
  leitner: LeitnerState;
  missionsCompleted: number;
  quizCorrect: number;
  quizAnswered: number;
  points: number;
  lastPosition: Point | null;
  /** Reportage en cours et étape atteinte. */
  story: StoryProgress | null;
  storiesDone: string[];
  /** Étapes dont la note figure au carnet : `reportage:étape`. */
  notes: string[];
  /** Lieux dans lesquels le joueur est entré. */
  roomsVisited: string[];
}

export function createInitialProgress(): ProgressData {
  return {
    version: PROGRESS_VERSION,
    profile: null,
    level: 'explorer',
    stamps: {},
    discoveredPlaces: [],
    crossedRivers: [],
    leitner: {},
    missionsCompleted: 0,
    quizCorrect: 0,
    quizAnswered: 0,
    points: 0,
    lastPosition: null,
    story: null,
    storiesDone: [],
    notes: [],
    roomsVisited: [],
  };
}

/** Pose un tampon la première fois : la date d'une première visite ne change jamais. */
export function stampCountry(progress: ProgressData, code: string, day: string): ProgressData {
  if (progress.stamps[code]) return progress;
  return { ...progress, stamps: { ...progress.stamps, [code]: day } };
}

function addUnique(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

export function discoverPlace(progress: ProgressData, id: string): ProgressData {
  const discoveredPlaces = addUnique(progress.discoveredPlaces, id);
  return discoveredPlaces === progress.discoveredPlaces
    ? progress
    : { ...progress, discoveredPlaces };
}

export function recordRiver(progress: ProgressData, id: string): ProgressData {
  const crossedRivers = addUnique(progress.crossedRivers, id);
  return crossedRivers === progress.crossedRivers ? progress : { ...progress, crossedRivers };
}

export interface RegionProgress {
  region: RegionId;
  visited: number;
  total: number;
  complete: boolean;
}

export function regionProgress(progress: ProgressData, catalog: GameCatalog): RegionProgress[] {
  return REGIONS.map((region) => {
    const members = catalog.countries.filter((country) => country.region === region);
    const visited = members.filter((country) => progress.stamps[country.code]).length;
    return {
      region,
      visited,
      total: members.length,
      complete: members.length > 0 && visited === members.length,
    };
  });
}

export function earnedBadges(progress: ProgressData, catalog: GameCatalog): RegionId[] {
  return regionProgress(progress, catalog)
    .filter((entry) => entry.complete)
    .map((entry) => entry.region);
}

/** Pourcentage de carte découverte : les 54 pays comptent, le territoire non autonome non. */
export function discoveredPercent(progress: ProgressData, catalog: GameCatalog): number {
  if (catalog.countries.length === 0) return 0;
  const visited = catalog.countries.filter((country) => progress.stamps[country.code]).length;
  return Math.round((visited / catalog.countries.length) * 100);
}

export function resetKeepingProfile(progress: ProgressData): ProgressData {
  return { ...createInitialProgress(), profile: progress.profile, level: progress.level };
}
