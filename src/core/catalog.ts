import type { CountryInfo, Level, Localized, PlaceInfo, RegionId } from './types';

export interface NamedFeature {
  id: string;
  names: Localized;
  level: Level;
}

/** Tout ce que les modes de jeu savent du monde, sans dépendre de la géométrie. */
export interface GameCatalog {
  countries: CountryInfo[];
  places: PlaceInfo[];
  rivers: NamedFeature[];
  neighbors: Record<string, string[]>;
}

export const REGIONS: RegionId[] = ['north', 'west', 'central', 'east', 'south'];

export function countryByCode(catalog: GameCatalog, code: string): CountryInfo | undefined {
  return catalog.countries.find((country) => country.code === code);
}

/** Capitale principale : la première listée qui n'est ni économique ni ancienne. */
export function primaryCapital(catalog: GameCatalog, code: string): PlaceInfo | undefined {
  return catalog.places.find((place) => place.country === code && place.kind === 'capital');
}

export function capitalsOf(catalog: GameCatalog, code: string): PlaceInfo[] {
  return catalog.places.filter(
    (place) => place.country === code && place.role !== undefined && place.role !== 'former',
  );
}

export function placesForLevel(catalog: GameCatalog, level: Level): PlaceInfo[] {
  return catalog.places.filter((place) => level !== 'explorer' || place.level === 'explorer');
}

export function riversForLevel(catalog: GameCatalog, level: Level): NamedFeature[] {
  return catalog.rivers.filter((river) => level !== 'explorer' || river.level === 'explorer');
}
