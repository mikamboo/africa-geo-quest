import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pointOnFeature from '@turf/point-on-feature';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import bbox from '@turf/bbox';
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
  MultiLineString,
  LineString,
} from 'geojson';
import {
  capitalsSchema,
  countriesSchema,
  hydroFileSchema,
  placesFileSchema,
  type PlaceData,
  type ReliefData,
} from '../../src/data/schemas';
import { project } from '../../src/core/projection';
import { ensureSources } from './sources';
import {
  CITY_COUNTRY_FIXES,
  CITY_EXCLUDED,
  CITY_NAME_FIXES,
  CITY_NAME_TRANSLATIONS,
} from './cityNames';

const MAPSHAPER = 'node_modules/.bin/mapshaper';
const OUT_DIR = 'public/geo';
const FLAGS_DIR = 'public/flags';
const CONTEXT_BBOX = '-32,-40,68,44';
const round = (value: number): number => Math.round(value * 100) / 100;

const countries = countriesSchema.parse(JSON.parse(readFileSync('data/countries.json', 'utf8')));
const capitals = capitalsSchema.parse(JSON.parse(readFileSync('data/capitals.json', 'utf8')));
const CODES = countries.map((country) => country.code);
const work = join('.cache', `build-${process.pid}`);
mkdirSync(work, { recursive: true });

function mapshaper(...args: string[]): void {
  execFileSync(MAPSHAPER, args, { stdio: ['ignore', 'ignore', 'inherit'] });
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/**
 * Pays : le champ `ISO_A3` contient des -99, on joint donc sur `ISO_A3_EH`.
 * Le Somaliland (`ADM0_A3 = SOL`) est fusionné dans la Somalie (ADR 0003).
 */
function buildBorders(countriesShp: string): void {
  const list = JSON.stringify(CODES);
  const assign = [
    `code = ADM0_A3 === 'SOL' ? 'SOM' : ISO_A3_EH;`,
    `playable = ${list}.indexOf(code) >= 0;`,
    `group = playable ? code : 'OTHER';`,
  ].join(' ');
  const others = join(work, 'others.geojson');
  const merged = join(work, 'mar-esh.geojson');
  mapshaper(
    countriesShp,
    '-each',
    assign,
    '-filter',
    `ADM0_A3 !== 'MAR' && ADM0_A3 !== 'SAH'`,
    '-clip',
    `bbox=${CONTEXT_BBOX}`,
    '-dissolve',
    'group',
    'copy-fields=playable',
    '-o',
    others,
    'format=geojson',
  );
  // Natural Earth découpe le Sahara occidental selon la ligne de fait. L'ADR 0003 retient
  // le contour reconnu par l'ONU, dont la limite nord suit le parallèle 27°40' N.
  mapshaper(
    countriesShp,
    '-filter',
    `ADM0_A3 === 'MAR' || ADM0_A3 === 'SAH'`,
    '-dissolve',
    '-o',
    merged,
    'format=geojson',
  );
  const morocco = join(work, 'morocco.geojson');
  const sahara = join(work, 'sahara.geojson');
  mapshaper(
    merged,
    '-clip',
    'bbox=-20,27.6667,5,40',
    '-each',
    `group = 'MAR'; playable = true`,
    '-o',
    morocco,
    'format=geojson',
  );
  mapshaper(
    merged,
    '-clip',
    'bbox=-20,20,5,27.6667',
    '-each',
    `group = 'ESH'; playable = true`,
    '-o',
    sahara,
    'format=geojson',
  );
  mapshaper(
    '-i',
    others,
    morocco,
    sahara,
    'combine-files',
    'snap',
    '-merge-layers',
    'force',
    '-simplify',
    'percentage=85%',
    'weighted',
    'keep-shapes',
    '-clean',
    '-split',
    'playable',
    '-o',
    join(work, 'world.topo.json'),
    'format=topojson',
    'combine-layers',
    'quantization=20000',
  );
}

function assembleBorders(): void {
  interface Topology {
    objects: Record<
      string,
      { type: string; geometries?: { properties?: Record<string, unknown> }[] }
    >;
  }
  const topo = readJson<Topology>(join(work, 'world.topo.json'));
  const names = Object.keys(topo.objects);
  const playableName = names.find((name) => name.endsWith('true'));
  const contextName = names.find((name) => name.endsWith('false'));
  if (!playableName || !contextName) throw new Error(`Couches inattendues : ${names.join(', ')}`);
  const playable = topo.objects[playableName]!;
  const context = topo.objects[contextName]!;
  for (const geometry of playable.geometries ?? []) {
    const code = geometry.properties?.group;
    geometry.properties = { code };
  }
  for (const geometry of context.geometries ?? []) geometry.properties = {};
  topo.objects = { countries: playable, context };
  writeFileSync(join(OUT_DIR, 'world.topo.json'), JSON.stringify(topo));
}

interface HydroConfig {
  id: string;
  names: { fr: string; en: string };
  level: 'explorer' | 'geographer';
  sources: string[];
}

function roundLine(line: number[][]): [number, number][] {
  return line.map(([lon, lat]) => [round(lon!), round(lat!)] as [number, number]);
}

function buildHydro(riversShp: string, lakesShp: string): void {
  const config = readJson<{ rivers: HydroConfig[]; lakes: HydroConfig[] }>('data/hydrography.json');
  const riverFile = join(work, 'rivers.json');
  mapshaper(
    riversShp,
    '-clip',
    'bbox=-20,-36,52,33',
    '-simplify',
    'percentage=45%',
    'keep-shapes',
    '-o',
    riverFile,
    'format=geojson',
  );
  const lakeFile = join(work, 'lakes.json');
  mapshaper(
    lakesShp,
    '-clip',
    'bbox=-20,-36,52,33',
    '-simplify',
    'percentage=45%',
    'keep-shapes',
    '-o',
    lakeFile,
    'format=geojson',
  );
  const riverData =
    readJson<FeatureCollection<LineString | MultiLineString, { name: string }>>(riverFile);
  const lakeData = readJson<FeatureCollection<Polygon | MultiPolygon, { name: string }>>(lakeFile);

  const rivers = config.rivers.map((river) => {
    const features = riverData.features.filter((feature) =>
      river.sources.includes(feature.properties.name),
    );
    if (features.length === 0) throw new Error(`Fleuve introuvable : ${river.id}`);
    const lines = features.flatMap((feature) =>
      feature.geometry.type === 'LineString'
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates,
    );
    return { id: river.id, names: river.names, level: river.level, lines: lines.map(roundLine) };
  });
  const lakes = config.lakes.map((lake) => {
    const features = lakeData.features.filter((feature) =>
      lake.sources.includes(feature.properties.name),
    );
    if (features.length === 0) throw new Error(`Lac introuvable : ${lake.id}`);
    const polygons = features.flatMap((feature) =>
      feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates,
    );
    return {
      id: lake.id,
      names: lake.names,
      level: lake.level,
      polygons: polygons.map((rings) => rings.map(roundLine)),
    };
  });
  const parsed = hydroFileSchema.parse({ rivers, lakes });
  writeFileSync(join(OUT_DIR, 'hydro.json'), JSON.stringify(parsed));
}

/** Échantillonne un polygone sur une grille pour poser les glyphes de relief. */
function sampleRelief(feature: Feature<Polygon | MultiPolygon>, step: number): [number, number][] {
  const [west, south, east, north] = bbox(feature) as [number, number, number, number];
  const samples: [number, number][] = [];
  let row = 0;
  for (let lat = south; lat <= north; lat += step, row += 1) {
    for (let lon = west + (row % 2 ? step / 2 : 0); lon <= east; lon += step) {
      if (booleanPointInPolygon([lon, lat], feature)) samples.push([round(lon), round(lat)]);
    }
  }
  return samples;
}

function buildRelief(regionsShp: string): ReliefData[] {
  const config =
    readJson<(Omit<ReliefData, 'label' | 'samples'> & { source: string })[]>('data/relief.json');
  const file = join(work, 'regions.json');
  mapshaper(
    regionsShp,
    '-clip',
    `bbox=${CONTEXT_BBOX}`,
    '-simplify',
    'percentage=30%',
    'keep-shapes',
    '-o',
    file,
    'format=geojson',
  );
  const data =
    readJson<FeatureCollection<Polygon | MultiPolygon, { NAME: string; REGION: string }>>(file);
  const stepByKind: Record<string, number> = { desert: 2.6, mountain: 0.9, plateau: 1.4 };
  return config.map(({ source, ...entry }) => {
    const matches = data.features.filter(
      (feature) => feature.properties.NAME === source && feature.properties.REGION === 'Africa',
    );
    const largest = matches[0];
    if (!largest) throw new Error(`Relief introuvable : ${source}`);
    const [lon, lat] = pointOnFeature(largest).geometry.coordinates as [number, number];
    const step = stepByKind[entry.kind];
    return {
      ...entry,
      label: [round(lon), round(lat)] as [number, number],
      samples: step ? matches.flatMap((feature) => sampleRelief(feature, step)) : [],
    };
  });
}

function buildPlaces(placesShp: string, relief: ReliefData[]): void {
  const file = join(work, 'cities.json');
  mapshaper(placesShp, '-o', file, 'format=json');
  interface RawCity {
    name: string;
    adm0_a3: string;
    latitude: number;
    longitude: number;
    pop_max: number;
  }
  const raw = readJson<RawCity[]>(file);
  const adm = (code: string): string => (code === 'SDS' ? 'SSD' : code === 'SOL' ? 'SOM' : code);
  const places: PlaceData[] = [];
  const slug = (value: string): string =>
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  for (const { code, cities } of capitals) {
    for (const city of cities) {
      places.push({
        id: `${code.toLowerCase()}-${slug(city.names.en)}`,
        kind: city.role === 'former' || city.role === 'economic' ? 'city' : 'capital',
        country: code,
        names: city.names,
        lat: city.lat,
        lon: city.lon,
        level: 'explorer',
        role: city.role,
      });
    }
  }

  const seen = new Set(places.map((place) => place.id));
  for (const code of CODES) {
    const candidates = raw
      .filter((city) => !CITY_EXCLUDED.includes(city.name))
      .filter((city) => (CITY_COUNTRY_FIXES[city.name] ?? adm(city.adm0_a3)) === code)
      .sort((a, b) => b.pop_max - a.pop_max);
    let kept = 0;
    for (const city of candidates) {
      if (kept >= 3) break;
      const fixed = CITY_NAME_FIXES[city.name] ?? city.name;
      const id = `${code.toLowerCase()}-${slug(fixed)}`;
      const capitalNames = capitals
        .find((entry) => entry.code === code)!
        .cities.map((entry) => entry.names.en);
      if (seen.has(id) || capitalNames.includes(fixed)) continue;
      seen.add(id);
      places.push({
        id,
        kind: 'city',
        country: code,
        names: { fr: CITY_NAME_TRANSLATIONS[fixed] ?? fixed, en: fixed },
        lat: round(city.latitude),
        lon: round(city.longitude),
        level: kept === 0 && city.pop_max >= 1_000_000 ? 'explorer' : 'geographer',
      });
      kept += 1;
    }
  }

  const curated = readJson<PlaceData[]>('data/pois.json');
  const neighbors = computeNeighbors();
  const parsed = placesFileSchema.parse({ places: [...places, ...curated], relief, neighbors });
  writeFileSync(join(OUT_DIR, 'places.json'), JSON.stringify(parsed));
}

/** Frontières terrestres déduites de la topologie : deux pays partagent un arc. */
function computeNeighbors(): Record<string, string[]> {
  interface Geometry {
    arcs: unknown;
    properties: { code: string };
  }
  const topo = readJson<{ objects: { countries: { geometries: Geometry[] } } }>(
    join(OUT_DIR, 'world.topo.json'),
  );
  const users = new Map<number, string[]>();
  const result: Record<string, Set<string>> = {};
  for (const geometry of topo.objects.countries.geometries) {
    const code = geometry.properties.code;
    result[code] = new Set();
    for (const arc of (geometry.arcs as unknown[]).flat(Infinity) as number[]) {
      const index = arc < 0 ? ~arc : arc;
      users.set(index, [...(users.get(index) ?? []), code]);
    }
  }
  for (const codes of users.values()) {
    for (const a of codes) for (const b of codes) if (a !== b) result[a]!.add(b);
  }
  return Object.fromEntries(Object.entries(result).map(([code, set]) => [code, [...set].sort()]));
}

/** Silhouette du continent pour l'accueil : un seul tracé, très simplifié, sans requête réseau. */
function buildSilhouette(countriesShp: string): void {
  const file = join(work, 'silhouette.json');
  const list = JSON.stringify([...CODES, 'ESH']);
  mapshaper(
    countriesShp,
    '-each',
    `code = ADM0_A3 === 'SOL' ? 'SOM' : ADM0_A3 === 'SAH' ? 'ESH' : ISO_A3_EH; keep = ${list}.indexOf(code) >= 0`,
    '-filter',
    'keep',
    '-clip',
    `bbox=-20,-36,52,38`,
    '-dissolve',
    '-simplify',
    'percentage=4%',
    'keep-shapes',
    '-filter-islands',
    'min-area=20000km2',
    '-o',
    file,
    'format=geojson',
  );
  const collection = readJson<{ geometries?: (Polygon | MultiPolygon)[] } & FeatureCollection>(
    file,
  );
  const geometry = (collection.geometries?.[0] ?? collection.features?.[0]?.geometry) as
    Polygon | MultiPolygon;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const scale = 0.1;
  let d = '';
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const points = polygons.map((rings) =>
    rings[0]!.map(([lon, lat]) => {
      const { x, y } = project(lon!, lat!);
      box.minX = Math.min(box.minX, x);
      box.minY = Math.min(box.minY, y);
      box.maxX = Math.max(box.maxX, x);
      box.maxY = Math.max(box.maxY, y);
      return [x, y] as [number, number];
    }),
  );
  for (const ring of points) {
    d += `M${ring
      .map(
        ([x, y]) => `${Math.round((x - box.minX) * scale)} ${Math.round((y - box.minY) * scale)}`,
      )
      .join('L')}Z`;
  }
  mkdirSync('src/data/generated', { recursive: true });
  writeFileSync(
    'src/data/generated/silhouette.json',
    JSON.stringify({
      width: Math.round((box.maxX - box.minX) * scale),
      height: Math.round((box.maxY - box.minY) * scale),
      d,
    }),
  );
}

function copyFlags(): void {
  rmSync(FLAGS_DIR, { recursive: true, force: true });
  mkdirSync(FLAGS_DIR, { recursive: true });
  for (const { iso2 } of countries) {
    copyFileSync(`node_modules/flag-icons/flags/4x3/${iso2}.svg`, join(FLAGS_DIR, `${iso2}.svg`));
  }
}

const paths = await ensureSources();
mkdirSync(OUT_DIR, { recursive: true });
buildBorders(paths.ne_50m_admin_0_countries!);
assembleBorders();
buildHydro(paths.ne_50m_rivers_lake_centerlines!, paths.ne_50m_lakes!);
buildPlaces(
  paths.ne_10m_populated_places_simple!,
  buildRelief(paths.ne_50m_geography_regions_polys!),
);
buildSilhouette(paths.ne_50m_admin_0_countries!);
copyFlags();
rmSync(work, { recursive: true, force: true });
console.log('Données générées dans public/geo et public/flags.');
