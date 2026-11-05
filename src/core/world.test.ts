import { describe, expect, it } from 'vitest';
import { project, unproject } from './projection';
import { createTestWorld } from './testing';

const { world } = createTestWorld();

describe('projection', () => {
  it('fait un aller-retour fidèle', () => {
    const { lon, lat } = unproject(project(17, -33));
    expect(lon).toBeCloseTo(17, 6);
    expect(lat).toBeCloseTo(-33, 6);
  });
  it('place le nord en haut', () => {
    expect(project(20, 30).y).toBeLessThan(project(20, -20).y);
  });
  it('donne environ un km par unité', () => {
    const delta = Math.abs(project(20, 3).y - project(20, 2).y);
    expect(delta).toBeGreaterThan(110);
    expect(delta).toBeLessThan(112);
  });
});

describe('locate', () => {
  it('détecte le pays et la terre', () => {
    expect(world.locate({ x: 500, y: 100 })).toMatchObject({
      country: 'BBB',
      terrain: 'land',
      outside: false,
    });
  });
  it('détecte la haute mer', () => {
    expect(world.locate({ x: 1500, y: 0 })).toMatchObject({ country: null, terrain: 'water' });
  });
  it('passe en eau sur un lac sans changer de pays', () => {
    expect(world.locate({ x: -300, y: -300 })).toMatchObject({
      country: 'AAA',
      terrain: 'water',
      lake: 'lac',
    });
  });
  it('détecte une île depuis sa zone minimale, sur eau', () => {
    expect(world.locate({ x: 3070, y: 0 })).toMatchObject({ country: 'ILE', terrain: 'water' });
    expect(world.locate({ x: 3200, y: 0 }).country).toBeNull();
  });
  it('privilégie le micro-État enclavé sur son voisin, zone comprise', () => {
    expect(world.hitRadiusOf('CCC')).toBeGreaterThan(0);
    expect(world.locate({ x: -800, y: 0 }).country).toBe('CCC');
    expect(world.locate({ x: -750, y: 0 }).country).toBe('CCC');
    expect(world.locate({ x: -600, y: 0 }).country).toBe('AAA');
  });
  it('ne donne pas de zone minimale à un grand pays', () => {
    expect(world.hitRadiusOf('AAA')).toBe(0);
    expect(world.hitRadiusOf('INCONNU')).toBe(0);
  });
  it('signale une terre hors du périmètre', () => {
    expect(world.locate({ x: 0, y: 1800 })).toMatchObject({
      country: null,
      terrain: 'land',
      outside: true,
    });
  });
  it('détecte le territoire non autonome sans le confondre avec un État', () => {
    expect(world.locate({ x: -2000, y: 0 }).country).toBe('ESH');
  });
});

describe('fleuves', () => {
  it('détecte une traversée', () => {
    expect(world.crossedRivers({ x: 550, y: 0 }, { x: 650, y: 0 })).toEqual(['grand']);
  });
  it('ignore un déplacement parallèle', () => {
    expect(world.crossedRivers({ x: 550, y: 0 }, { x: 550, y: 100 })).toEqual([]);
  });
  it('ignore un segment qui reste hors emprise', () => {
    expect(world.crossedRivers({ x: 0, y: 0 }, { x: 10, y: 0 })).toEqual([]);
    expect(world.crossedRivers({ x: 900, y: 0 }, { x: 910, y: 0 })).toEqual([]);
    expect(world.crossedRivers({ x: 600, y: -900 }, { x: 610, y: -900 })).toEqual([]);
    expect(world.crossedRivers({ x: 600, y: 900 }, { x: 610, y: 900 })).toEqual([]);
  });
  it('s’arrête sur une ligne qui longe sans couper', () => {
    expect(world.crossedRivers({ x: 590, y: -500 }, { x: 595, y: -390 })).toEqual([]);
  });
  it('donne le point le plus proche du fleuve', () => {
    const point = world.nearestRiverPoint('grand', { x: 0, y: 0 });
    expect(point?.x).toBeCloseTo(600, 0);
    expect(world.nearestRiverPoint('inconnu', { x: 0, y: 0 })).toBeNull();
  });
});

describe('lieux et limites', () => {
  it('filtre les lieux selon le niveau', () => {
    expect(world.placesNear({ x: -700, y: -300 }, 'explorer').map((p) => p.id)).toEqual([]);
    expect(world.placesNear({ x: -700, y: -300 }, 'geographer').map((p) => p.id)).toEqual([
      'aaa-city',
    ]);
  });
  it('retrouve un lieu par identifiant', () => {
    expect(world.placeById('site')?.country).toBe('AAA');
    expect(world.placeById('absent')).toBeUndefined();
  });
  it('borne la position aux limites de la carte', () => {
    const clamped = world.clampToBounds({ x: 1e6, y: -1e6 });
    expect(clamped.x).toBe(world.bounds.maxX);
    expect(clamped.y).toBe(world.bounds.minY);
    expect(world.clampToBounds({ x: -1e6, y: 1e6 })).toEqual({
      x: world.bounds.minX,
      y: world.bounds.maxY,
    });
  });
  it("mesure l'aire et la distance à un pays", () => {
    expect(world.areaOf('AAA')).toBeGreaterThan(900_000);
    expect(world.areaOf('ABSENT')).toBe(0);
    expect(world.distanceToCountry('AAA', -500, 0)).toBe(0);
    expect(world.distanceToCountry('AAA', 100, 0)).toBeCloseTo(100, 0);
    expect(world.distanceToCountry('ABSENT', 0, 0)).toBe(Infinity);
  });
});
