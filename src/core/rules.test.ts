import { describe, expect, it } from 'vitest';
import { dayNumber, dueItems, masteredCount, MAX_BOX, reviewCard } from './leitner';
import { dailyStreak } from './dates';
import { createRng, hashString, pick, shuffle } from './rng';
import {
  createInitialProgress,
  discoverPlace,
  discoveredPercent,
  earnedBadges,
  recordRiver,
  regionProgress,
  resetKeepingProfile,
  stampCountry,
} from './progress';
import { dailyScore, missionPoints, quizPoints } from './scoring';
import { generatePseudonyms, isValidPseudonym, migrateLegacyPseudonym, ROLES } from './pseudonyms';
import { createTestWorld } from './testing';
import { capitalsOf, countryByCode, primaryCapital } from './catalog';

const { catalog } = createTestWorld();

describe('rng', () => {
  it('est déterministe', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a()]).toEqual([b(), b()]);
  });
  it('varie avec la graine', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
  it('mélange sans perdre ni modifier la source', () => {
    const source = [1, 2, 3, 4];
    expect(shuffle(createRng(1), source).sort()).toEqual(source);
    expect(source).toEqual([1, 2, 3, 4]);
  });
  it('refuse un tirage vide', () => {
    expect(() => pick(createRng(1), [])).toThrow();
  });
  it('hache de façon stable', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});

describe('Leitner', () => {
  it('monte une carte réussie et espace la révision', () => {
    const state = reviewCard({}, 'x', true, 100);
    expect(state.x).toEqual({ box: 1, dueDay: 100 });
    const next = reviewCard(state, 'x', true, 100);
    expect(next.x).toEqual({ box: 2, dueDay: 101 });
  });
  it('ramène une erreur en boîte 1, à revoir aujourd’hui', () => {
    let state = reviewCard({}, 'x', true, 100);
    state = reviewCard(state, 'x', true, 100);
    state = reviewCard(state, 'x', false, 105);
    expect(state.x).toEqual({ box: 1, dueDay: 105 });
  });
  it('plafonne à la dernière boîte', () => {
    let state = {};
    for (let i = 0; i < 10; i += 1) state = reviewCard(state, 'x', true, 0);
    expect(masteredCount(state)).toBe(1);
    expect((state as Record<string, { box: number }>).x!.box).toBe(MAX_BOX);
  });
  it('liste les cartes dues, les plus fragiles d’abord', () => {
    const state = {
      a: { box: 3, dueDay: 5 },
      b: { box: 1, dueDay: 5 },
      c: { box: 1, dueDay: 4 },
      d: { box: 1, dueDay: 99 },
    };
    expect(dueItems(state, 5)).toEqual(['c', 'b', 'a']);
  });
  it('convertit une date en jour UTC', () => {
    expect(dayNumber(new Date('1970-01-02T23:00:00Z'))).toBe(1);
  });
});

describe('progression', () => {
  it('pose un tampon une seule fois', () => {
    const once = stampCountry(createInitialProgress(), 'AAA', '2026-01-01');
    const twice = stampCountry(once, 'AAA', '2027-01-01');
    expect(twice.stamps.AAA).toBe('2026-01-01');
    expect(twice).toBe(once);
  });
  it('ne duplique ni lieu ni fleuve', () => {
    const p = recordRiver(discoverPlace(createInitialProgress(), 'a'), 'r');
    expect(discoverPlace(p, 'a')).toBe(p);
    expect(recordRiver(p, 'r')).toBe(p);
    expect(p.discoveredPlaces).toEqual(['a']);
    expect(p.crossedRivers).toEqual(['r']);
  });
  it('calcule le pourcentage sans compter le territoire non autonome', () => {
    let p = createInitialProgress();
    p = stampCountry(p, 'AAA', 'd');
    p = stampCountry(p, 'ESH', 'd');
    expect(discoveredPercent(p, catalog)).toBe(20);
    expect(discoveredPercent(p, { ...catalog, countries: [] })).toBe(0);
  });
  it('donne un badge à une région complète seulement', () => {
    let p = stampCountry(createInitialProgress(), 'AAA', 'd');
    expect(earnedBadges(p, catalog)).toEqual([]);
    p = stampCountry(p, 'CCC', 'd');
    expect(earnedBadges(p, catalog)).toEqual(['west']);
    expect(regionProgress(p, catalog).find((r) => r.region === 'east')?.visited).toBe(0);
  });
  it('réinitialise en gardant le profil', () => {
    const profile = {
      avatar: 'zola' as const,
      pseudonym: { role: 'astronomer', adjective: 'calm' },
    };
    const p = { ...stampCountry(createInitialProgress(), 'AAA', 'd'), profile };
    const reset = resetKeepingProfile(p);
    expect(reset.profile).toEqual(profile);
    expect(reset.stamps).toEqual({});
  });
});

describe('catalogue', () => {
  it('trouve les pays et les capitales', () => {
    expect(countryByCode(catalog, 'AAA')?.code).toBe('AAA');
    expect(primaryCapital(catalog, 'AAA')?.id).toBe('aaa-cap');
    expect(capitalsOf(catalog, 'AAA').map((p) => p.id)).toEqual(['aaa-cap']);
    expect(capitalsOf(catalog, 'BBB').map((p) => p.id)).toEqual(['bbb-cap', 'bbb-eco']);
  });
});

describe('score', () => {
  it('sans chrono, le temps ne compte pas', () => {
    expect(missionPoints(9999, false)).toBe(100);
  });
  it('avec chrono, le bonus reste positif', () => {
    expect(missionPoints(10, true)).toBe(190);
    expect(missionPoints(9999, true)).toBe(100);
  });
  it('une mauvaise réponse rapporte quand même des points', () => {
    expect(quizPoints(false)).toBeGreaterThan(0);
    expect(quizPoints(true)).toBeGreaterThan(quizPoints(false));
  });
  it('récompense une mission réussie sans aide, sans jamais pénaliser', () => {
    expect(missionPoints(5, false, true)).toBe(150);
    expect(missionPoints(5, false, false)).toBe(100);
    expect(missionPoints(10, true, true)).toBe(240);
  });
  it('le défi garde un plancher', () => {
    expect(dailyScore(1)).toBe(995);
    expect(dailyScore(99999)).toBe(100);
  });
});

describe('série du défi', () => {
  const today = new Date('2026-11-05T12:00:00Z');
  it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
    expect(dailyStreak(['2026-11-05', '2026-11-04', '2026-11-03'], today)).toBe(3);
  });
  it('ne perd pas la série tant que le défi du jour reste à faire', () => {
    expect(dailyStreak(['2026-11-04', '2026-11-03'], today)).toBe(2);
  });
  it('repart de zéro après un trou', () => {
    expect(dailyStreak(['2026-11-05', '2026-11-03'], today)).toBe(1);
    expect(dailyStreak(['2026-11-02'], today)).toBe(0);
    expect(dailyStreak([], today)).toBe(0);
  });
  it('traverse un changement de mois', () => {
    expect(dailyStreak(['2026-11-01', '2026-10-31'], new Date('2026-11-01T01:00:00Z'))).toBe(2);
  });
});

describe('pseudonymes', () => {
  it('ne génère que des pseudonymes valides, tous différents', () => {
    const list = generatePseudonyms(createRng(3), 6);
    expect(list).toHaveLength(6);
    expect(list.every(isValidPseudonym)).toBe(true);
    expect(new Set(list.map((p) => p.role)).size).toBe(6);
  });
  it('refuse un texte libre', () => {
    expect(isValidPseudonym({ role: 'Jean Dupont', adjective: 'fast' })).toBe(false);
    expect(isValidPseudonym({ role: 'poet', adjective: 'xxx' })).toBe(false);
  });
  it('ne contient aucun animal', () => {
    for (const animal of ['gazelle', 'lion', 'zebra', 'okapi']) {
      expect(ROLES as readonly string[]).not.toContain(animal);
    }
  });
  it('convertit les anciens pseudonymes et refuse le reste', () => {
    expect(migrateLegacyPseudonym('gazelle', 'curious')).toEqual({
      role: 'cartographer',
      adjective: 'lucid',
    });
    expect(migrateLegacyPseudonym('Jean Dupont', 'calm')).toBeNull();
    expect(migrateLegacyPseudonym('lion', 'xxx')).toBeNull();
  });
  it('borne la demande à la taille des listes', () => {
    expect(generatePseudonyms(createRng(3), 999)).toHaveLength(12);
  });
});
