import type { Position } from 'geojson';
import { mesh } from 'topojson-client';
import type { GameCatalog } from '../core/catalog';
import type { Story } from '../core/stories';
import type { CountryGeometry, CountryInfo, PlaceInfo } from '../core/types';
import { WorldModel } from '../core/world';
import countriesJson from '../../data/countries.json';
import storiesJson from '../../data/stories.json';
import {
  countriesSchema,
  hydroFileSchema,
  storiesSchema,
  placesFileSchema,
  type HydroFile,
  type ReliefData,
} from './schemas';
import { decodeBorders, type WorldTopology } from './world';

export const COUNTRIES: CountryInfo[] = countriesSchema.parse(countriesJson);

export interface GameData {
  world: WorldModel;
  catalog: GameCatalog;
  countries: CountryGeometry[];
  context: Position[][][];
  hydro: HydroFile;
  relief: ReliefData[];
  places: PlaceInfo[];
  stories: Story[];
  /** Frontières terrestres entre pays, sans doublon. */
  borderLines: Position[][];
  /** Trait de côte des pays jouables. */
  coastLines: Position[][];
}

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Chargement impossible de ${path} : ${response.status}`);
  return response.json();
}

let pending: Promise<GameData> | null = null;

async function load(): Promise<GameData> {
  const [topologyRaw, hydroRaw, placesRaw] = await Promise.all([
    fetchJson('/geo/world.topo.json'),
    fetchJson('/geo/hydro.json'),
    fetchJson('/geo/places.json'),
  ]);
  const topology = topologyRaw as WorldTopology;
  const hydro = hydroFileSchema.parse(hydroRaw);
  const placesFile = placesFileSchema.parse(placesRaw);
  const { countries, context } = decodeBorders(topology);
  const places: PlaceInfo[] = placesFile.places;
  const world = new WorldModel({
    countries,
    context,
    rivers: hydro.rivers,
    lakes: hydro.lakes,
    places,
    islandCodes: new Set(COUNTRIES.filter((country) => country.island).map((c) => c.code)),
  });
  const catalog: GameCatalog = {
    countries: COUNTRIES,
    places,
    rivers: hydro.rivers.map(({ id, names, level }) => ({ id, names, level })),
    neighbors: placesFile.neighbors,
  };
  const borderLines = mesh(topology, topology.objects.countries, (a, b) => a !== b).coordinates;
  const coastLines = mesh(topology, topology.objects.countries, (a, b) => a === b).coordinates;
  return {
    world,
    catalog,
    countries,
    context,
    hydro,
    relief: placesFile.relief,
    places,
    stories: storiesSchema.parse(storiesJson),
    borderLines,
    coastLines,
  };
}

/** Charge les données géographiques une seule fois, à la demande. */
export function loadGameData(): Promise<GameData> {
  pending ??= load().catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}
