import { describe, expect, it } from 'vitest';
import { dayNumber, dueItems, masteredCount, MAX_BOX, reviewCard } from './leitner';
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
import { generatePseudonyms, isValidPseudonym } from './pseudonyms';
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
    const profile = { avatar: 'zola' as const, pseudonym: { animal: 'lion', adjective: 'calm' } };
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
  it('le défi garde un plancher', () => {
    expect(dailyScore(1)).toBe(995);
    expect(dailyScore(99999)).toBe(100);
  });
});

describe('pseudonymes', () => {
  it('ne génère que des pseudonymes valides, tous différents', () => {
    const list = generatePseudonyms(createRng(3), 6);
    expect(list).toHaveLength(6);
    expect(list.every(isValidPseudonym)).toBe(true);
    expect(new Set(list.map((p) => p.animal)).size).toBe(6);
  });
  it('refuse un texte libre', () => {
    expect(isValidPseudonym({ animal: 'Jean Dupont', adjective: 'fast' })).toBe(false);
    expect(isValidPseudonym({ animal: 'lion', adjective: 'xxx' })).toBe(false);
  });
  it('borne la demande à la taille des listes', () => {
    expect(generatePseudonyms(createRng(3), 999)).toHaveLength(12);
  });
});
