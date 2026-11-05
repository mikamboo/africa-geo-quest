import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { WorldModel } from '../../src/core/world';
import { project } from '../../src/core/projection';
import {
  capitalsSchema,
  countriesSchema,
  hydroFileSchema,
  placesFileSchema,
} from '../../src/data/schemas';
import { decodeBorders, type WorldTopology } from '../../src/data/world';

export const EXPECTED_CODES =
  'DZA AGO BEN BWA BFA BDI CPV CMR CAF TCD COM COG COD CIV DJI EGY GNQ ERI SWZ ETH GAB GMB GHA GIN GNB KEN LSO LBR LBY MDG MWI MLI MRT MUS MAR MOZ NAM NER NGA RWA STP SEN SYC SLE SOM ZAF SSD SDN TZA TGO TUN UGA ZMB ZWE'.split(
    ' ',
  );
export const EXPECTED_LANDLOCKED =
  'BWA BFA BDI CAF TCD SWZ ETH LSO MWI MLI NER RWA SSD UGA ZMB ZWE'.split(' ');

/** Budget de la section 7 : frontières sous 500 Ko au total. */
export const BORDERS_BUDGET_BYTES = 500 * 1024;

/** Écart toléré entre une capitale et le contour simplifié de son pays. */
export const CAPITAL_TOLERANCE_KM = 25;

function read<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function loadAll() {
  const countries = countriesSchema.parse(read('data/countries.json'));
  const capitals = capitalsSchema.parse(read('data/capitals.json'));
  const topology = read<WorldTopology>('public/geo/world.topo.json');
  const hydro = hydroFileSchema.parse(read('public/geo/hydro.json'));
  const placesFile = placesFileSchema.parse(read('public/geo/places.json'));
  const borders = decodeBorders(topology);
  const world = new WorldModel({
    countries: borders.countries,
    context: borders.context,
    rivers: hydro.rivers,
    lakes: hydro.lakes,
    places: placesFile.places,
    islandCodes: new Set(countries.filter((country) => country.island).map((c) => c.code)),
  });
  return { countries, capitals, topology, hydro, placesFile, borders, world };
}

export function geoFilesBytes(): number {
  return readdirSync('public/geo').reduce(
    (sum, name) => sum + statSync(join('public/geo', name)).size,
    0,
  );
}

/**
 * Sans accès à la mer d'après la topologie : tous les arcs du pays sont partagés
 * avec un autre pays. Un arc utilisé une seule fois est un trait de côte.
 */
export function geometricallyLandlocked(topology: WorldTopology): string[] {
  const usage = new Map<number, number>();
  const arcsOf = (geometry: object): number[] =>
    (('arcs' in geometry ? geometry.arcs : []) as unknown[]).flat(Infinity) as number[];
  const objects = [
    ...topology.objects.countries.geometries,
    ...topology.objects.context.geometries,
  ];
  for (const geometry of objects) {
    for (const arc of arcsOf(geometry)) {
      const index = arc < 0 ? ~arc : arc;
      usage.set(index, (usage.get(index) ?? 0) + 1);
    }
  }
  return topology.objects.countries.geometries
    .filter((geometry) =>
      arcsOf(geometry).every((arc) => (usage.get(arc < 0 ? ~arc : arc) ?? 0) > 1),
    )
    .map((geometry) => codeOf(geometry));
}

function codeOf(geometry: object): string {
  return (geometry as { properties: { code: string } }).properties.code;
}

/** Vérifie les invariants métier ; retourne la liste des erreurs. */
export function runChecks(): string[] {
  const errors: string[] = [];
  const { countries, capitals, topology, placesFile, world } = loadAll();

  const metaCodes = countries.map((country) => country.code).sort();
  if (metaCodes.join() !== [...EXPECTED_CODES].sort().join()) {
    errors.push('countries.json ne contient pas exactement les 54 codes attendus');
  }
  const landlocked = countries
    .filter((c) => c.landlocked)
    .map((c) => c.code)
    .sort();
  if (landlocked.join() !== [...EXPECTED_LANDLOCKED].sort().join()) {
    errors.push(`Liste sans accès à la mer incorrecte : ${landlocked.join(' ')}`);
  }
  const geoCodes = topology.objects.countries.geometries.map(codeOf);
  for (const code of EXPECTED_CODES) {
    if (!geoCodes.includes(code)) errors.push(`Géométrie manquante : ${code}`);
  }
  if (geoCodes.length !== 55 || !geoCodes.includes('ESH')) {
    errors.push(`Attendu 54 pays et ESH, trouvé ${geoCodes.length} géométries`);
  }
  if (geoFilesBytes() > BORDERS_BUDGET_BYTES) {
    errors.push(`Budget géographique dépassé : ${geoFilesBytes()} octets`);
  }

  for (const entry of capitals) {
    for (const city of entry.cities) {
      const { x, y } = project(city.lon, city.lat);
      // Le trait de côte à 1:50m est grossier : une ville côtière peut tomber juste en mer.
      const gap = world.distanceToCountry(entry.code, x, y);
      if (gap > CAPITAL_TOLERANCE_KM) {
        errors.push(`${city.names.en} (${entry.code}) à ${gap.toFixed(0)} km de son pays`);
      }
    }
  }
  const ids = new Set<string>();
  for (const place of placesFile.places) {
    if (ids.has(place.id)) errors.push(`Identifiant de lieu dupliqué : ${place.id}`);
    ids.add(place.id);
  }
  return errors;
}
