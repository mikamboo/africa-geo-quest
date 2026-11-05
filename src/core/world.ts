import {
  bboxContains,
  bboxOfRings,
  distanceToRing,
  emptyBBox,
  extendBBox,
  pointInPolygon,
  ringArea,
  segmentsIntersect,
  type BBox,
  type PlanarPolygon,
  type Point,
  type Ring,
} from './geometry';
import { project } from './projection';
import type {
  CountryGeometry,
  LakeGeometry,
  Level,
  PlaceInfo,
  RiverGeometry,
  Terrain,
} from './types';
import type { Position } from 'geojson';

/** Pays dont la surface est sous ce seuil (km²) : micro-États terrestres. */
const MICRO_AREA_KM2 = 30_000;
/** Zone de détection minimale autour d'un micro-État terrestre. */
const MICRO_RADIUS_KM = 22;
/** Zone de détection autour d'un pays insulaire. */
const ISLAND_RADIUS_KM = 90;
/** Distance à laquelle un lieu est considéré comme découvert. */
export const PLACE_REACH_KM = 55;

interface CountryShape {
  code: string;
  polygons: PlanarPolygon[];
  bbox: BBox;
  areaKm2: number;
  island: boolean;
  /** Rayon de la zone de détection minimale (0 si aucune). */
  hitRadiusKm: number;
}

interface WaterShape {
  id: string;
  polygons: PlanarPolygon[];
  bbox: BBox;
}

interface RiverLine {
  riverId: string;
  points: Ring;
  bbox: BBox;
}

export interface PositionedPlace extends PlaceInfo {
  x: number;
  y: number;
}

export interface WorldInput {
  countries: CountryGeometry[];
  context: Position[][][];
  rivers: RiverGeometry[];
  lakes: LakeGeometry[];
  places: PlaceInfo[];
  islandCodes: ReadonlySet<string>;
}

export interface Location {
  /** Code du pays courant, `null` en haute mer ou hors du continent. */
  country: string | null;
  terrain: Terrain;
  /** Identifiant du lac courant, s'il y en a un. */
  lake: string | null;
  /** Vrai sur une terre hors du périmètre jouable (Europe, Arabie…). */
  outside: boolean;
}

function toRing(coordinates: Position[]): Ring {
  const ring = new Float64Array(coordinates.length * 2);
  coordinates.forEach((position, index) => {
    const { x, y } = project(position[0]!, position[1]!);
    ring[index * 2] = x;
    ring[index * 2 + 1] = y;
  });
  return ring;
}

function toPolygons(polygons: Position[][][]): PlanarPolygon[] {
  return polygons.map((rings) => rings.map(toRing));
}

function bboxOfPolygons(polygons: PlanarPolygon[]): BBox {
  return bboxOfRings(polygons.flat());
}

function polygonsArea(polygons: PlanarPolygon[]): number {
  return polygons.reduce((sum, [outer]) => sum + (outer ? ringArea(outer) : 0), 0);
}

function inAnyPolygon(polygons: PlanarPolygon[], x: number, y: number): boolean {
  return polygons.some((polygon) => pointInPolygon(polygon, x, y));
}

function distanceToPolygons(polygons: PlanarPolygon[], x: number, y: number): number {
  let best = Infinity;
  for (const polygon of polygons) {
    for (const ring of polygon) best = Math.min(best, distanceToRing(ring, x, y));
  }
  return best;
}

export class WorldModel {
  readonly bounds: BBox;
  readonly places: PositionedPlace[];
  private readonly countries: CountryShape[];
  private readonly context: PlanarPolygon[];
  private readonly lakes: WaterShape[];
  private readonly riverLines: RiverLine[];
  private readonly smallCountries: CountryShape[];

  constructor(input: WorldInput) {
    this.countries = input.countries
      .map((country) => {
        const polygons = toPolygons(country.polygons);
        const areaKm2 = polygonsArea(polygons);
        const island = input.islandCodes.has(country.code);
        const hitRadiusKm = island
          ? ISLAND_RADIUS_KM
          : areaKm2 < MICRO_AREA_KM2
            ? MICRO_RADIUS_KM
            : 0;
        return {
          code: country.code,
          polygons,
          bbox: bboxOfPolygons(polygons),
          areaKm2,
          island,
          hitRadiusKm,
        };
      })
      .sort((a, b) => a.areaKm2 - b.areaKm2);
    this.smallCountries = this.countries.filter((country) => country.hitRadiusKm > 0);
    this.context = toPolygons(input.context);
    this.lakes = input.lakes.map((lake) => {
      const polygons = toPolygons(lake.polygons);
      return { id: lake.id, polygons, bbox: bboxOfPolygons(polygons) };
    });
    this.riverLines = input.rivers.flatMap((river) =>
      river.lines.map((line) => {
        const points = toRing(line);
        return { riverId: river.id, points, bbox: bboxOfRings([points]) };
      }),
    );
    this.places = input.places.map((place) => ({ ...place, ...project(place.lon, place.lat) }));

    const bounds = emptyBBox();
    for (const country of this.countries) {
      extendBBox(bounds, country.bbox.minX, country.bbox.minY);
      extendBBox(bounds, country.bbox.maxX, country.bbox.maxY);
    }
    const margin = 300;
    this.bounds = {
      minX: bounds.minX - margin,
      minY: bounds.minY - margin,
      maxX: bounds.maxX + margin,
      maxY: bounds.maxY + margin,
    };
  }

  /** Aire projetée d'un pays en km², utile aux tests et au réglage des zones. */
  areaOf(code: string): number {
    return this.countries.find((country) => country.code === code)?.areaKm2 ?? 0;
  }

  hitRadiusOf(code: string): number {
    return this.countries.find((country) => country.code === code)?.hitRadiusKm ?? 0;
  }

  /** Distance (km) d'un point au contour d'un pays, 0 s'il est dedans. */
  distanceToCountry(code: string, x: number, y: number): number {
    const country = this.countries.find((candidate) => candidate.code === code);
    if (!country) return Infinity;
    return inAnyPolygon(country.polygons, x, y) ? 0 : distanceToPolygons(country.polygons, x, y);
  }

  /** Pays contenant strictement le point, sans zone de détection. */
  countryAt(x: number, y: number): string | null {
    for (const country of this.countries) {
      if (bboxContains(country.bbox, x, y) && inAnyPolygon(country.polygons, x, y)) {
        return country.code;
      }
    }
    return null;
  }

  /** Micro-État ou île dont la zone de détection minimale couvre le point. */
  private nearbySmallCountry(x: number, y: number): string | null {
    let best: string | null = null;
    let bestDistance = Infinity;
    for (const country of this.smallCountries) {
      if (!bboxContains(country.bbox, x, y, country.hitRadiusKm)) continue;
      const d = distanceToPolygons(country.polygons, x, y);
      if (d <= country.hitRadiusKm && d < bestDistance) {
        best = country.code;
        bestDistance = d;
      }
    }
    return best;
  }

  locate(point: Point): Location {
    const { x, y } = point;
    const exact = this.countryAt(x, y);
    const lake = this.lakes.find(
      (candidate) => bboxContains(candidate.bbox, x, y) && inAnyPolygon(candidate.polygons, x, y),
    );
    const onContext = exact === null && inAnyPolygon(this.context, x, y);
    const terrain: Terrain = lake || (exact === null && !onContext) ? 'water' : 'land';
    let country = exact;
    if (!onContext) {
      const small = this.nearbySmallCountry(x, y);
      // Une enclave terrestre passe avant son voisin, mais un pays reste prioritaire s'il est lui-même petit.
      if (small && (exact === null || this.areaOf(exact) > this.areaOf(small))) country = small;
    }
    return { country, terrain, lake: lake?.id ?? null, outside: onContext };
  }

  /** Fleuves coupés par le segment [from, to]. */
  crossedRivers(from: Point, to: Point): string[] {
    const crossed = new Set<string>();
    for (const line of this.riverLines) {
      if (crossed.has(line.riverId)) continue;
      const { bbox, points } = line;
      if (
        Math.max(from.x, to.x) < bbox.minX ||
        Math.min(from.x, to.x) > bbox.maxX ||
        Math.max(from.y, to.y) < bbox.minY ||
        Math.min(from.y, to.y) > bbox.maxY
      ) {
        continue;
      }
      for (let i = 0; i + 3 < points.length; i += 2) {
        if (
          segmentsIntersect(
            from.x,
            from.y,
            to.x,
            to.y,
            points[i]!,
            points[i + 1]!,
            points[i + 2]!,
            points[i + 3]!,
          )
        ) {
          crossed.add(line.riverId);
          break;
        }
      }
    }
    return [...crossed];
  }

  /** Point du fleuve le plus proche, pour orienter le joueur. */
  nearestRiverPoint(riverId: string, from: Point): Point | null {
    let best: Point | null = null;
    let bestDistance = Infinity;
    for (const line of this.riverLines) {
      if (line.riverId !== riverId) continue;
      for (let i = 0; i + 1 < line.points.length; i += 2) {
        const x = line.points[i]!;
        const y = line.points[i + 1]!;
        const d = Math.hypot(x - from.x, y - from.y);
        if (d < bestDistance) {
          bestDistance = d;
          best = { x, y };
        }
      }
    }
    return best;
  }

  /** Lieux à portée, filtrés par niveau de jeu. */
  placesNear(point: Point, level: Level, radiusKm = PLACE_REACH_KM): PositionedPlace[] {
    const radiusSq = radiusKm * radiusKm;
    return this.places.filter((place) => {
      if (level === 'explorer' && place.level !== 'explorer') return false;
      const dx = place.x - point.x;
      const dy = place.y - point.y;
      return dx * dx + dy * dy <= radiusSq;
    });
  }

  clampToBounds(point: Point): Point {
    return {
      x: Math.max(this.bounds.minX, Math.min(this.bounds.maxX, point.x)),
      y: Math.max(this.bounds.minY, Math.min(this.bounds.maxY, point.y)),
    };
  }

  /** Point représentatif d'un lieu par identifiant. */
  placeById(id: string): PositionedPlace | undefined {
    return this.places.find((place) => place.id === id);
  }
}
