/** Boîtes de Leitner : une bonne réponse espace la révision, une erreur la ramène, sans pénalité. */
export const BOX_INTERVALS_DAYS = [0, 1, 3, 7, 15] as const;
export const MAX_BOX = BOX_INTERVALS_DAYS.length;

export interface LeitnerCard {
  box: number;
  /** Jour (entier UTC) à partir duquel la carte est à revoir. */
  dueDay: number;
}

export type LeitnerState = Record<string, LeitnerCard>;

export function dayNumber(date: Date): number {
  return Math.floor(date.getTime() / 86_400_000);
}

export function reviewCard(
  state: LeitnerState,
  itemId: string,
  correct: boolean,
  today: number,
): LeitnerState {
  const current = state[itemId];
  const box = correct ? Math.min((current?.box ?? 0) + 1, MAX_BOX) : 1;
  const interval = correct ? BOX_INTERVALS_DAYS[box - 1]! : 0;
  return { ...state, [itemId]: { box, dueDay: today + interval } };
}

/** Cartes à revoir, les plus fragiles d'abord. */
export function dueItems(state: LeitnerState, today: number): string[] {
  return Object.entries(state)
    .filter(([, card]) => card.dueDay <= today)
    .sort(([, a], [, b]) => a.box - b.box || a.dueDay - b.dueDay)
    .map(([id]) => id);
}

export function masteredCount(state: LeitnerState): number {
  return Object.values(state).filter((card) => card.box >= MAX_BOX).length;
}
