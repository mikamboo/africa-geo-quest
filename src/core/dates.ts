/** Date UTC au format AAAA-MM-JJ : la même partout au même instant. */
export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
