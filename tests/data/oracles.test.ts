import { describe, expect, it } from 'vitest';
import pointOnFeature from '@turf/point-on-feature';
import { multiPolygon } from '@turf/helpers';
import { project } from '../../src/core/projection';
import {
  BORDERS_BUDGET_BYTES,
  CAPITAL_TOLERANCE_KM,
  EXPECTED_CODES,
  EXPECTED_LANDLOCKED,
  geoFilesBytes,
  geometricallyLandlocked,
  loadAll,
  runChecks,
} from '../../scripts/data/checks';

const data = loadAll();

describe('oracles géographiques', () => {
  it('passe tous les contrôles métier', () => {
    expect(runChecks()).toEqual([]);
  });

  it('contient exactement les 54 pays attendus et le territoire non autonome', () => {
    const codes = data.borders.countries.map((country) => country.code).sort();
    expect(codes).toEqual([...EXPECTED_CODES, 'ESH'].sort());
  });

  it('a un polygone non vide pour chaque pays', () => {
    for (const country of data.borders.countries) {
      expect(country.polygons.length, country.code).toBeGreaterThan(0);
    }
  });

  it('détecte chaque pays sur un point intérieur', () => {
    for (const country of data.borders.countries) {
      const inner = pointOnFeature(multiPolygon(country.polygons)).geometry.coordinates;
      const { x, y } = project(inner[0]!, inner[1]!);
      expect(data.world.locate({ x, y }).country, country.code).toBe(country.code);
    }
  });

  it('retrouve les 16 pays sans accès à la mer depuis les métadonnées', () => {
    const landlocked = data.countries.filter((c) => c.landlocked).map((c) => c.code);
    expect(landlocked.sort()).toEqual([...EXPECTED_LANDLOCKED].sort());
  });

  it('retrouve les 16 pays sans accès à la mer depuis la topologie seule', () => {
    expect(geometricallyLandlocked(data.topology).sort()).toEqual([...EXPECTED_LANDLOCKED].sort());
  });

  it('respecte le budget de 500 Ko', () => {
    expect(geoFilesBytes()).toBeLessThan(BORDERS_BUDGET_BYTES);
  });

  it('fusionne le Somaliland dans la Somalie', () => {
    const hargeisa = project(44.06, 9.56);
    expect(data.world.locate(hargeisa).country).toBe('SOM');
  });

  it('garde le Sahara occidental distinct du Maroc', () => {
    expect(data.world.locate(project(-13.2, 24.5)).country).toBe('ESH');
    expect(data.world.locate(project(-12.0, 27.0)).country).toBe('ESH');
    expect(data.world.locate(project(-9.0, 29.0)).country).toBe('MAR');
    expect(data.countries.map((c) => c.code)).not.toContain('ESH');
  });

  it('donne aux micro-États une zone de détection minimale', () => {
    for (const code of ['GMB', 'SWZ', 'DJI', 'STP', 'COM', 'SYC', 'MUS', 'CPV']) {
      expect(data.world.hitRadiusOf(code), code).toBeGreaterThan(0);
    }
  });
});

describe('capitales curatées', () => {
  const capitalOf = (code: string) =>
    data.capitals.find((entry) => entry.code === code)!.cities.map((city) => city.names.en);

  it('couvre les cas délicats', () => {
    expect(capitalOf('BDI')[0]).toBe('Gitega');
    expect(capitalOf('TZA')[0]).toBe('Dodoma');
    expect(capitalOf('CIV')).toEqual(['Yamoussoukro', 'Abidjan']);
    expect(capitalOf('BEN')).toEqual(['Porto-Novo', 'Cotonou']);
    expect(capitalOf('ZAF')).toEqual(['Pretoria', 'Cape Town', 'Bloemfontein']);
    expect(capitalOf('SWZ')).toEqual(['Mbabane', 'Lobamba']);
    expect(capitalOf('GNQ')[0]).toBe('Ciudad de la Paz');
  });

  it('place chaque capitale dans son pays', () => {
    for (const entry of data.capitals) {
      for (const city of entry.cities) {
        const { x, y } = project(city.lon, city.lat);
        const gap = data.world.distanceToCountry(entry.code, x, y);
        expect(gap, city.names.en).toBeLessThanOrEqual(CAPITAL_TOLERANCE_KM);
      }
    }
  });
});
