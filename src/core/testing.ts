import type { Position } from 'geojson';
import { unproject } from './projection';
import { WorldModel } from './world';
import type { GameCatalog } from './catalog';
import type { CountryInfo, PlaceInfo } from './types';

/** Carré exprimé en km monde, reconverti en [lon, lat] pour passer par la vraie projection. */
export function squareKm(cx: number, cy: number, half: number): Position[] {
  return [
    [cx - half, cy - half],
    [cx + half, cy - half],
    [cx + half, cy + half],
    [cx - half, cy + half],
    [cx - half, cy - half],
  ].map(([x, y]) => {
    const { lon, lat } = unproject({ x: x!, y: y! });
    return [lon, lat];
  });
}

function lonLat(x: number, y: number): Position {
  const { lon, lat } = unproject({ x, y });
  return [lon, lat];
}

function country(code: string, region: CountryInfo['region'], extra = {}): CountryInfo {
  return {
    code,
    iso2: code.slice(0, 2).toLowerCase(),
    names: { fr: code, en: code },
    region,
    landlocked: false,
    island: false,
    ...extra,
  };
}

function place(
  id: string,
  kind: PlaceInfo['kind'],
  code: string,
  x: number,
  y: number,
  extra = {},
): PlaceInfo {
  const { lon, lat } = unproject({ x, y });
  return {
    id,
    kind,
    country: code,
    names: { fr: id, en: id },
    lat,
    lon,
    level: 'explorer',
    ...extra,
  };
}

/**
 * Monde de test : AAA et BBB côte à côte, CCC enclavé et petit, ILE au large, DDD sans mer,
 * un lac dans AAA, un fleuve vertical dans BBB, une terre de contexte tout à l'est.
 */
export function createTestWorld(): { world: WorldModel; catalog: GameCatalog } {
  const places: PlaceInfo[] = [
    place('aaa-cap', 'capital', 'AAA', -400, 0, { role: 'official' }),
    place('bbb-cap', 'capital', 'BBB', 400, 0, { role: 'official' }),
    place('bbb-eco', 'city', 'BBB', 700, 300, { role: 'economic' }),
    place('ccc-cap', 'capital', 'CCC', -800, 0, { role: 'official' }),
    place('ddd-cap', 'capital', 'DDD', 0, -1000, { role: 'official' }),
    place('ile-cap', 'capital', 'ILE', 3000, 0, { role: 'official' }),
    place('old-cap', 'city', 'AAA', -600, 300, { role: 'former' }),
    place('aaa-city', 'city', 'AAA', -700, -300, { level: 'geographer' }),
    place('site', 'monument', 'AAA', -300, 400, { level: 'geographer' }),
  ];
  const catalog: GameCatalog = {
    countries: [
      country('AAA', 'west'),
      country('BBB', 'east'),
      country('CCC', 'west'),
      country('DDD', 'north', { landlocked: true }),
      country('ILE', 'east', { island: true }),
    ],
    places,
    rivers: [
      { id: 'grand', names: { fr: 'Grand', en: 'Big' }, level: 'explorer' },
      { id: 'petit', names: { fr: 'Petit', en: 'Small' }, level: 'geographer' },
    ],
    neighbors: {
      AAA: ['BBB', 'CCC', 'DDD'],
      BBB: ['AAA', 'DDD'],
      CCC: ['AAA'],
      DDD: ['AAA', 'BBB'],
      ILE: [],
    },
  };
  const world = new WorldModel({
    countries: [
      { code: 'AAA', polygons: [[squareKm(-500, 0, 500)]] },
      { code: 'BBB', polygons: [[squareKm(500, 0, 500)]] },
      { code: 'CCC', polygons: [[squareKm(-800, 0, 40)]] },
      { code: 'DDD', polygons: [[squareKm(0, -1000, 500)]] },
      { code: 'ILE', polygons: [[squareKm(3000, 0, 10)]] },
      { code: 'ESH', polygons: [[squareKm(-2000, 0, 300)]] },
    ],
    context: [[squareKm(0, 1800, 400)]],
    rivers: [
      {
        id: 'grand',
        names: { fr: 'Grand', en: 'Big' },
        level: 'explorer',
        lines: [[lonLat(600, -400), lonLat(600, 400)]],
      },
    ],
    lakes: [
      {
        id: 'lac',
        names: { fr: 'Lac', en: 'Lake' },
        level: 'explorer',
        polygons: [[squareKm(-300, -300, 80)]],
      },
    ],
    places,
    islandCodes: new Set(['ILE']),
  });
  return { world, catalog };
}
