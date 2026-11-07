/** Date UTC au format AAAA-MM-JJ : la même partout au même instant. */
export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

/**
 * Nombre de jours consécutifs joués, jusqu'à aujourd'hui ou hier :
 * une série n'est pas perdue tant que le défi du jour reste faisable.
 */
export function dailyStreak(dateKeys: readonly string[], today: Date): number {
  const played = new Set(dateKeys);
  let cursor = today.getTime();
  if (!played.has(utcDateKey(today))) cursor -= DAY_MS;
  let streak = 0;
  while (played.has(utcDateKey(new Date(cursor)))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}
