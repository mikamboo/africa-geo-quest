import { capitalsOf, riversForLevel, type GameCatalog } from './catalog';
import { createRng, hashString, pick } from './rng';
import type { Mission } from './missions';
import type { Point } from './geometry';
import { project } from './projection';

/** Date UTC au format AAAA-MM-JJ : la même partout au même instant. */
export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dailySeed(dateKey: string): number {
  return hashString(`tembea-daily-${dateKey}`);
}

export interface DailyChallenge {
  dateKey: string;
  mission: Mission;
  start: Point;
  startPlaceId: string;
}

/** Même mission et même départ pour tous, déduits de la seule date UTC. */
export function dailyChallenge(dateKey: string, catalog: GameCatalog): DailyChallenge {
  const rng = createRng(dailySeed(dateKey));
  const sorted = [...catalog.countries].sort((a, b) => a.code.localeCompare(b.code));
  const startCountry = pick(rng, sorted);
  const startPlace = capitalsOf(catalog, startCountry.code)[0];
  if (!startPlace) throw new Error(`Capitale manquante : ${startCountry.code}`);
  const start = project(startPlace.lon, startPlace.lat);

  const kind = pick(rng, ['place', 'river', 'landlocked'] as const);
  let mission: Mission;
  if (kind === 'river') {
    const river = pick(rng, riversForLevel(catalog, 'explorer'));
    mission = { id: `river:${river.id}`, type: 'cross-river', targetId: river.id };
  } else if (kind === 'landlocked') {
    mission = { id: 'find:landlocked', type: 'find-landlocked', targetId: '' };
  } else {
    const neighbors = catalog.neighbors[startCountry.code] ?? [];
    const inRange = sorted.filter(
      (country) => neighbors.includes(country.code) && capitalsOf(catalog, country.code).length > 0,
    );
    const targetCountry = pick(rng, inRange.length > 0 ? inRange : sorted);
    const target = capitalsOf(catalog, targetCountry.code)[0]!;
    mission = { id: `go:${target.id}`, type: 'go-to-place', targetId: target.id };
  }
  return { dateKey, mission, start, startPlaceId: startPlace.id };
}
