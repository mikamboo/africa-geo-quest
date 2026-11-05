import type { Position } from 'geojson';

export type Locale = 'fr' | 'en';
export type Level = 'explorer' | 'geographer';
export type RegionId = 'north' | 'west' | 'central' | 'east' | 'south';
export type Terrain = 'land' | 'water';

export interface Localized {
  fr: string;
  en: string;
}

export interface CountryInfo {
  code: string;
  iso2: string;
  names: Localized;
  region: RegionId;
  landlocked: boolean;
  island: boolean;
}

export type PlaceKind = 'capital' | 'city' | 'monument' | 'nature';

export interface PlaceInfo {
  id: string;
  kind: PlaceKind;
  country: string;
  names: Localized;
  lat: number;
  lon: number;
  level: Level;
  role?: string;
  blurb?: Localized;
  sourceUrl?: string;
}

/** Code du territoire non autonome : affiché, mais hors des 54 (ADR 0003). */
export const NON_STATE_TERRITORY = 'ESH';

export interface CountryGeometry {
  code: string;
  /** Liste de polygones, chaque polygone étant une liste d'anneaux [lon, lat]. */
  polygons: Position[][][];
}

export interface RiverGeometry {
  id: string;
  names: Localized;
  level: Level;
  lines: Position[][];
}

export interface LakeGeometry {
  id: string;
  names: Localized;
  level: Level;
  polygons: Position[][][];
}
