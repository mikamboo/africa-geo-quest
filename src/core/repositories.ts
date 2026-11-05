import type { ProgressData } from './progress';

export interface LoadResult<T> {
  value: T;
  /** Vrai si des données illisibles ont été écartées au chargement. */
  recovered: boolean;
}

/** Point d'extension : un backend se branche ici sans toucher au reste de `core/`. */
export interface ProgressRepository {
  load(): LoadResult<ProgressData>;
  save(progress: ProgressData): void;
  clear(): void;
}

export interface DailyScore {
  dateKey: string;
  score: number;
  seconds: number;
}

export interface ScoreRepository {
  loadDailyScores(): DailyScore[];
  /** Conserve le meilleur score de la date. Retourne l'entrée retenue. */
  recordDaily(score: DailyScore): DailyScore;
  clear(): void;
}
