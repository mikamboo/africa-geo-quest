import {
  capitalsOf,
  countryByCode,
  placesForLevel,
  riversForLevel,
  type GameCatalog,
} from './catalog';
import { distance, type Point } from './geometry';
import type { Mission } from './missionRules';
import { project } from './projection';
import { pick, shuffle, type Rng } from './rng';
import type { Level } from './types';

export { missionCompletedBy, type Mission, type MissionType } from './missionRules';

export type Compass = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface MissionHint {
  distanceKm: number;
  compass: Compass;
  target: Point;
}

export function compassBetween(from: Point, to: Point): Compass {
  // L'axe y de l'écran pointe vers le bas : le nord est à y décroissant.
  const angle = (Math.atan2(to.x - from.x, from.y - to.y) * 180) / Math.PI;
  const sectors: Compass[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return sectors[((Math.round(angle / 45) % 8) + 8) % 8]!;
}

export interface MissionGeometry {
  /** Point le plus proche du fleuve, fourni par la couche qui connaît la géométrie. */
  nearestRiverPoint: (riverId: string, from: Point) => Point | null;
}

function candidatePoints(mission: Mission, catalog: GameCatalog): Point[] {
  const capitalPoints = (predicate: (code: string) => boolean): Point[] =>
    catalog.countries
      .filter((country) => predicate(country.code))
      .flatMap((country) => capitalsOf(catalog, country.code).slice(0, 1))
      .map((place) => project(place.lon, place.lat));
  if (mission.type === 'find-landlocked') {
    return capitalPoints((code) => countryByCode(catalog, code)?.landlocked === true);
  }
  if (mission.type === 'find-island') {
    return capitalPoints((code) => countryByCode(catalog, code)?.island === true);
  }
  const place = catalog.places.find((candidate) => candidate.id === mission.targetId);
  return place ? [project(place.lon, place.lat)] : [];
}

/** Direction et distance vers l'objectif le plus proche, pour guider sans donner la réponse brute. */
export function missionHint(
  mission: Mission,
  from: Point,
  catalog: GameCatalog,
  geometry: MissionGeometry,
  currentCountry: string | null = null,
): MissionHint | null {
  const riverPoint =
    mission.type === 'cross-river' ? geometry.nearestRiverPoint(mission.targetId, from) : null;
  const excludedCapital = currentCountry
    ? capitalsOf(catalog, currentCountry)
        .slice(0, 1)
        .map((place) => project(place.lon, place.lat))
    : [];
  const candidates =
    mission.type === 'cross-river'
      ? riverPoint
        ? [riverPoint]
        : []
      : candidatePoints(mission, catalog).filter(
          (point) =>
            mission.type === 'go-to-place' ||
            !excludedCapital.some((excluded) => distance(excluded, point) < 1),
        );
  let best: Point | null = null;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const d = distance(from, candidate);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  if (!best) return null;
  return {
    distanceKm: Math.round(bestDistance),
    compass: compassBetween(from, best),
    target: best,
  };
}

/** Rayon de recherche croissant : les premières missions restent proches du joueur. */
export function missionRadiusKm(missionsCompleted: number, level: Level = 'explorer'): number {
  const radius = Math.min(900 + missionsCompleted * 250, 6000);
  return level === 'expert' ? Math.max(radius, 2500) : radius;
}

function placeMission(place: { id: string }): Mission {
  return { id: `go:${place.id}`, type: 'go-to-place', targetId: place.id };
}

function pickPlaceMission(
  rng: Rng,
  catalog: GameCatalog,
  level: Level,
  from: Point,
  radius: number,
  visited: ReadonlySet<string>,
): Mission {
  const eligible = placesForLevel(catalog, level).filter(
    (place) => (place.kind === 'capital' || level !== 'explorer') && !visited.has(place.id),
  );
  const pool = eligible.length > 0 ? eligible : placesForLevel(catalog, level);
  const scored = pool.map((place) => ({
    place,
    distance: distance(from, project(place.lon, place.lat)),
  }));
  const near = scored.filter((entry) => entry.distance > 120 && entry.distance <= radius);
  if (near.length > 0) return placeMission(pick(rng, near).place);
  const closest = scored
    .filter((entry) => entry.distance > 120)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
  return placeMission(pick(rng, closest.length > 0 ? closest : scored).place);
}

function pickRiverMission(
  rng: Rng,
  catalog: GameCatalog,
  level: Level,
  crossed: ReadonlySet<string>,
): Mission {
  const rivers = riversForLevel(catalog, level);
  const fresh = rivers.filter((river) => !crossed.has(river.id));
  const river = pick(rng, fresh.length > 0 ? fresh : rivers);
  return { id: `river:${river.id}`, type: 'cross-river', targetId: river.id };
}

export interface MissionContext {
  level: Level;
  from: Point;
  missionsCompleted: number;
  discoveredPlaces: readonly string[];
  crossedRivers: readonly string[];
}

/** Propose une mission de chaque type, adaptée au niveau et à la progression. */
export function generateMissions(
  rng: Rng,
  catalog: GameCatalog,
  context: MissionContext,
): Mission[] {
  const radius = missionRadiusKm(context.missionsCompleted, context.level);
  const discovered = new Set(context.discoveredPlaces);
  const searches: Mission[] = [
    { id: 'find:landlocked', type: 'find-landlocked', targetId: '' },
    { id: 'find:island', type: 'find-island', targetId: '' },
  ];
  const canFindIsland = context.missionsCompleted >= 3;
  return [
    pickPlaceMission(rng, catalog, context.level, context.from, radius, discovered),
    pickRiverMission(rng, catalog, context.level, new Set(context.crossedRivers)),
    canFindIsland ? pick(rng, shuffle(rng, searches)) : searches[0]!,
  ];
}
