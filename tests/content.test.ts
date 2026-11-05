import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { factsFileSchema } from '../src/data/facts';
import { project } from '../src/core/projection';
import en from '../src/i18n/en.json';
import fr from '../src/i18n/fr.json';
import { EXPECTED_CODES, loadAll } from '../scripts/data/checks';

function keysOf(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(child, prefix ? `${prefix}.${key}` : key),
  );
}

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const factsFr = factsFileSchema.parse(read('data/facts.fr.json'));
const factsEn = factsFileSchema.parse(read('data/facts.en.json'));
const data = loadAll();
const sorted = [...EXPECTED_CODES].sort();

/** Les pluriels français ont une forme de plus : on compare les clés sans suffixe de pluriel. */
const normalize = (keys: string[]): string[] =>
  [...new Set(keys.map((key) => key.replace(/_(one|other|many)$/, '')))].sort();

describe('i18n', () => {
  it('a les mêmes clés en français et en anglais', () => {
    expect(normalize(keysOf(fr))).toEqual(normalize(keysOf(en)));
  });
  it('ne laisse aucune traduction vide', () => {
    const allowEmpty = 'card.role.official';
    for (const file of [fr, en]) {
      for (const key of keysOf(file)) {
        if (key === allowEmpty) continue;
        const value = key
          .split('.')
          .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], file);
        expect(String(value).length, key).toBeGreaterThan(0);
      }
    }
  });
});

describe('fiches pays', () => {
  it('couvre les 54 pays dans les deux langues, et rien de plus', () => {
    expect(Object.keys(factsFr).sort()).toEqual(sorted);
    expect(Object.keys(factsEn).sort()).toEqual(sorted);
  });
  it('garde le statut de brouillon : aucun relecteur humain n’est déclaré', () => {
    for (const code of sorted) {
      expect(factsFr[code]?.reviewStatus).toBe('ai-draft');
      expect(factsEn[code]?.reviewStatus).toBe('ai-draft');
    }
  });
  it('utilise la même source fiable dans les deux langues', () => {
    for (const code of sorted) {
      expect(factsFr[code]?.sourceUrl).toBe(factsEn[code]?.sourceUrl);
      expect(new URL(factsFr[code]!.sourceUrl).hostname).toMatch(
        /(^|\.)(unesco\.org|britannica\.com)$/,
      );
    }
  });
  it('reste court', () => {
    for (const code of sorted) {
      expect(factsFr[code]!.text.length, code).toBeLessThanOrEqual(200);
      expect(factsEn[code]!.text.length, code).toBeLessThanOrEqual(200);
    }
  });
  it('évite les sujets choquants pour cet âge', () => {
    const banned = /\b(guerre|massacre|génocide|esclav|famine|war|genocide|slave|famine)/i;
    for (const code of sorted) {
      expect(factsFr[code]!.text, code).not.toMatch(banned);
      expect(factsEn[code]!.text, code).not.toMatch(banned);
    }
  });
  it('a une citation de vérification pour chaque pays', () => {
    const quotes = read('data/facts.quotes.json') as Record<string, string>;
    for (const code of sorted) expect(quotes[code]?.length, code).toBeGreaterThan(10);
  });
  it('liste chaque pays dans le document de relecture', () => {
    const review = readFileSync('docs/REVIEW_FACTS.md', 'utf8');
    for (const code of sorted) expect(review, code).toContain(`(${code})`);
  });
});

/** Atoll seychellois réel, absent de Natural Earth à 1:50m : il se rejoint en pirogue. */
const OUTLYING_ISLANDS = ['poi-aldabra'];

describe('drapeaux et lieux', () => {
  it('a un drapeau auto-hébergé pour chaque pays', () => {
    for (const country of data.countries) {
      expect(existsSync(`public/flags/${country.iso2}.svg`), country.code).toBe(true);
    }
  });
  it('place chaque point d’intérêt dans ou tout près de son pays', () => {
    const pois = data.placesFile.places.filter((place) => place.id.startsWith('poi-'));
    expect(pois.length).toBeGreaterThanOrEqual(30);
    for (const poi of pois) {
      const { x, y } = project(poi.lon, poi.lat);
      const gap = data.world.distanceToCountry(poi.country, x, y);
      if (OUTLYING_ISLANDS.includes(poi.id)) {
        expect(data.world.locate({ x, y }).terrain, poi.id).toBe('water');
      } else {
        // Un îlot absent à 1:50m reste dans la zone de détection de son pays insulaire.
        expect(gap, poi.id).toBeLessThanOrEqual(Math.max(30, data.world.hitRadiusOf(poi.country)));
      }
      expect(poi.blurb?.fr, poi.id).toBeTruthy();
      expect(poi.blurb?.en, poi.id).toBeTruthy();
      expect(poi.sourceUrl, poi.id).toBeTruthy();
    }
  });
  it('propose villes, monuments et sites naturels', () => {
    const kinds = new Set(data.placesFile.places.map((place) => place.kind));
    expect([...kinds].sort()).toEqual(['capital', 'city', 'monument', 'nature']);
  });
});
