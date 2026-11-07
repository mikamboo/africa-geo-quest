import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { factsFileSchema } from '../src/data/facts';
import { project } from '../src/core/projection';
import { validateDialogue } from '../src/core/dialogue';
import { stopDialogue, type StoryStop } from '../src/core/stories';
import { storiesSchema } from '../src/data/schemas';
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

/** Charte éditoriale (`docs/CHARTE_EDITORIALE.md`) : mots interdits, quel que soit le sujet. */
const CLICHES =
  /\b(gorilles?|girafes?|éléphants?|hippopotames?|singes?|okapis?|antilopes?|gazelles?|zèbres?|chimpanzés?|giraffes?|elephants?|hippos?|monkeys?|zebras?|safari|brousse|jungle|bush|tribus?|tribes?|tribal|primitifs?|primitive|exotiques?|exotic|sauvages?|savages?|ancestrale?s?|mystérieu[xs]e?|mysterious)\b/i;

describe('charte éditoriale', () => {
  it('écarte animaux et clichés des fiches pays', () => {
    for (const code of sorted) {
      expect(factsFr[code]!.text, code).not.toMatch(CLICHES);
      expect(factsEn[code]!.text, code).not.toMatch(CLICHES);
    }
  });
  it('écarte animaux et clichés des lieux', () => {
    for (const place of data.placesFile.places) {
      for (const text of [place.blurb?.fr ?? '', place.blurb?.en ?? '', place.names.fr]) {
        expect(text, place.id).not.toMatch(CLICHES);
      }
    }
  });
  it('écarte animaux et clichés de l’interface', () => {
    for (const file of [fr, en]) {
      expect(JSON.stringify(file)).not.toMatch(CLICHES);
    }
  });
  it('ne parle plus de « découvrir » l’Afrique ni de pirogue', () => {
    for (const file of [fr, en]) {
      // Les valeurs seulement : les clés techniques `explorer` restent stables dans les sauvegardes.
      const text = JSON.stringify(file, (_key, value) => value).replace(/"[\w-]+":/g, '');
      expect(text).not.toMatch(/découvert|discovered|explorateur|\bExplorer\b|pirogue|canoe/i);
    }
  });
  it('garde plus de lieux humains que de sites naturels', () => {
    const pois = data.placesFile.places.filter((place) => place.id.startsWith('poi-'));
    const nature = pois.filter((place) => place.kind === 'nature').length;
    expect(nature).toBeLessThan(pois.length / 2);
  });
});

describe('reportages', () => {
  const stories = storiesSchema.parse(read('data/stories.json'));
  const places = new Map(data.placesFile.places.map((place) => [place.id, place]));

  it('comptent assez d’étapes, dans des pays différents par reportage', () => {
    expect(stories.length).toBeGreaterThanOrEqual(6);
    for (const story of stories) {
      const countries = story.stops.map((stop) => places.get(stop.placeId)?.country);
      expect(new Set(countries).size, story.id).toBe(story.stops.length);
    }
  });
  it('mènent à des lieux visibles à tous les niveaux', () => {
    for (const story of stories) {
      for (const stop of story.stops) {
        const place = places.get(stop.placeId);
        expect(place, stop.placeId).toBeDefined();
        expect(place?.level, stop.placeId).toBe('explorer');
      }
    }
  });
  it('ont des indices qui ne donnent ni la ville ni le pays', () => {
    for (const story of stories) {
      for (const stop of story.stops) {
        const place = places.get(stop.placeId)!;
        const country = data.countries.find((c) => c.code === place.country)!;
        for (const name of [place.names.fr, country.names.fr]) {
          expect(stop.clue.fr, `${stop.placeId} ${name}`).not.toContain(name);
        }
        for (const name of [place.names.en, country.names.en]) {
          expect(stop.clue.en, `${stop.placeId} ${name}`).not.toContain(name);
        }
      }
    }
  });
  it('ont des conversations sans impasse, et une seule bonne réponse', () => {
    for (const story of stories) {
      story.stops.forEach((stop, index) => {
        const graph = stopDialogue(stop as StoryStop, story.stops[index + 1] as StoryStop);
        expect(validateDialogue(graph), stop.placeId).toEqual([]);
        expect(stop.question.options[stop.question.answer], stop.placeId).toBeDefined();
      });
    }
  });
  it('ne placent pas toujours la bonne réponse au même endroit', () => {
    const positions = stories.flatMap((s) => s.stops.map((stop) => stop.question.answer));
    expect(new Set(positions).size).toBeGreaterThan(1);
  });
  it('respectent la charte éditoriale', () => {
    expect(JSON.stringify(stories.map((s) => [s.title, s.intro, s.outro, s.stops]))).not.toMatch(
      CLICHES,
    );
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
      {
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
