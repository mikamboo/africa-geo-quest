import { describe, expect, it } from 'vitest';
import {
  compassBetween,
  generateMissions,
  missionCompletedBy,
  missionHint,
  missionRadiusKm,
  type Mission,
} from './missions';
import { buildQuestion, generateQuiz, optionCount } from './quiz';
import { dailyChallenge, dailySeed, utcDateKey } from './daily';
import { createRng } from './rng';
import { createTestWorld } from './testing';
import { createInitialProgress } from './progress';
import { project } from './projection';

const { world, catalog } = createTestWorld();
const geometry = { nearestRiverPoint: world.nearestRiverPoint.bind(world) };

describe('missions', () => {
  const go: Mission = { id: 'g', type: 'go-to-place', targetId: 'aaa-cap' };
  const river: Mission = { id: 'r', type: 'cross-river', targetId: 'grand' };
  const landlocked: Mission = { id: 'l', type: 'find-landlocked', targetId: '' };
  const island: Mission = { id: 'i', type: 'find-island', targetId: '' };

  it('réussit « aller à » sur le bon lieu seulement', () => {
    expect(missionCompletedBy(go, { type: 'place-reached', id: 'aaa-cap' }, catalog)).toBe(true);
    expect(missionCompletedBy(go, { type: 'place-reached', id: 'site' }, catalog)).toBe(false);
    expect(missionCompletedBy(go, { type: 'river-crossed', id: 'grand' }, catalog)).toBe(false);
  });
  it('réussit « traverser » sur le bon fleuve seulement', () => {
    expect(missionCompletedBy(river, { type: 'river-crossed', id: 'grand' }, catalog)).toBe(true);
    expect(missionCompletedBy(river, { type: 'river-crossed', id: 'autre' }, catalog)).toBe(false);
  });
  it('réussit « sans mer » dans un pays enclavé seulement', () => {
    const enter = (code: string) => ({ type: 'country-entered' as const, code, from: null });
    expect(missionCompletedBy(landlocked, enter('DDD'), catalog)).toBe(true);
    expect(missionCompletedBy(landlocked, enter('AAA'), catalog)).toBe(false);
    expect(missionCompletedBy(landlocked, enter('ESH'), catalog)).toBe(false);
  });
  it('réussit « île » sur une île seulement', () => {
    const enter = (code: string) => ({ type: 'country-entered' as const, code, from: null });
    expect(missionCompletedBy(island, enter('ILE'), catalog)).toBe(true);
    expect(missionCompletedBy(island, enter('AAA'), catalog)).toBe(false);
  });
  it('oriente la boussole', () => {
    const o = { x: 0, y: 0 };
    expect(compassBetween(o, { x: 0, y: -10 })).toBe('N');
    expect(compassBetween(o, { x: 10, y: 0 })).toBe('E');
    expect(compassBetween(o, { x: 0, y: 10 })).toBe('S');
    expect(compassBetween(o, { x: -10, y: 0 })).toBe('W');
    expect(compassBetween(o, { x: -10, y: -10 })).toBe('NW');
  });
  it('donne un indice vers un lieu, un fleuve et le pays enclavé le plus proche', () => {
    const from = { x: 500, y: 0 };
    expect(missionHint(go, from, catalog, geometry)?.compass).toBe('W');
    // La cible est le sommet le plus proche de la ligne, pas sa projection exacte.
    expect(missionHint(river, from, catalog, geometry)?.distanceKm).toBe(412);
    expect(missionHint(landlocked, from, catalog, geometry)?.target).toEqual(
      project(
        catalog.places.find((p) => p.id === 'ddd-cap')!.lon,
        catalog.places.find((p) => p.id === 'ddd-cap')!.lat,
      ),
    );
    expect(missionHint(island, from, catalog, geometry)?.compass).toBe('E');
  });
  it("n'envoie pas vers le pays enclavé où l'on se trouve déjà", () => {
    expect(missionHint(landlocked, { x: 0, y: -1000 }, catalog, geometry, 'DDD')).toBeNull();
  });
  it('retourne null sans cible', () => {
    const unknown: Mission = { id: 'x', type: 'go-to-place', targetId: 'absent' };
    expect(missionHint(unknown, { x: 0, y: 0 }, catalog, geometry)).toBeNull();
    const noRiver: Mission = { id: 'x', type: 'cross-river', targetId: 'absent' };
    expect(missionHint(noRiver, { x: 0, y: 0 }, catalog, geometry)).toBeNull();
  });
  it('agrandit le rayon avec la progression, avec un plafond', () => {
    expect(missionRadiusKm(0)).toBeLessThan(missionRadiusKm(4));
    expect(missionRadiusKm(1000)).toBe(6000);
  });
  it('propose au moins 3 types distincts', () => {
    const list = generateMissions(createRng(1), catalog, {
      level: 'explorer',
      from: { x: 0, y: 0 },
      missionsCompleted: 0,
      discoveredPlaces: [],
      crossedRivers: [],
    });
    expect(new Set(list.map((m) => m.type)).size).toBe(3);
    expect(list.map((m) => m.type)).toEqual(['go-to-place', 'cross-river', 'find-landlocked']);
  });
  it('écarte les fleuves déjà traversés et les lieux découverts', () => {
    const list = generateMissions(createRng(1), catalog, {
      level: 'geographer',
      from: { x: 0, y: 0 },
      missionsCompleted: 5,
      discoveredPlaces: ['aaa-cap', 'bbb-cap'],
      crossedRivers: ['grand'],
    });
    expect(list[1]?.targetId).toBe('petit');
    expect(['aaa-cap', 'bbb-cap']).not.toContain(list[0]?.targetId);
  });
  it('reste jouable quand tout est découvert ou trop loin', () => {
    const all = catalog.places.map((p) => p.id);
    const list = generateMissions(createRng(2), catalog, {
      level: 'explorer',
      from: { x: 50000, y: 0 },
      missionsCompleted: 0,
      discoveredPlaces: all,
      crossedRivers: ['grand', 'petit'],
    });
    expect(list).toHaveLength(3);
  });
  it('débloque la recherche d’île avec la progression', () => {
    const types = new Set<string>();
    for (let seed = 0; seed < 20; seed += 1) {
      const list = generateMissions(createRng(seed), catalog, {
        level: 'explorer',
        from: { x: 0, y: 0 },
        missionsCompleted: 3,
        discoveredPlaces: [],
        crossedRivers: [],
      });
      types.add(list[2]!.type);
    }
    expect(types).toContain('find-island');
  });
});

describe('quiz', () => {
  const progress = (extra = {}) => ({ ...createInitialProgress(), ...extra });

  it('ajuste le nombre de réponses', () => {
    expect(optionCount('explorer', 0)).toBe(3);
    expect(optionCount('explorer', 3)).toBe(4);
    expect(optionCount('geographer', 0)).toBe(4);
  });
  it('génère des questions cohérentes : la réponse figure dans les options', () => {
    const quiz = generateQuiz(createRng(1), catalog, progress(), 0, 5);
    expect(quiz.length).toBeGreaterThan(0);
    for (const question of quiz) {
      expect(question.options).toContain(question.answer);
      expect(new Set(question.options).size).toBe(question.options.length);
    }
  });
  it('donne la priorité aux cartes à revoir', () => {
    const leitner = { 'capital-of:DDD': { box: 1, dueDay: 0 } };
    const quiz = generateQuiz(createRng(1), catalog, progress({ leitner }), 10, 3);
    expect(quiz[0]?.itemId).toBe('capital-of:DDD');
  });
  it('privilégie ensuite les pays visités', () => {
    const quiz = generateQuiz(createRng(1), catalog, progress({ stamps: { BBB: 'd' } }), 0, 1);
    expect(quiz[0]?.subject).toBe('BBB');
  });
  it('ne répète pas le même sujet et ignore les pays inconnus', () => {
    const quiz = generateQuiz(createRng(1), catalog, progress({ stamps: { ESH: 'd' } }), 0, 5);
    const subjects = quiz.map((q) => q.subject);
    expect(new Set(subjects).size).toBe(subjects.length);
    expect(subjects).not.toContain('ESH');
  });
  it('propose les types Géographe et les villes découvertes', () => {
    const kinds = new Set<string>();
    for (let seed = 0; seed < 30; seed += 1) {
      const quiz = generateQuiz(
        createRng(seed),
        catalog,
        progress({
          level: 'geographer',
          stamps: { AAA: 'd', DDD: 'd', ILE: 'd' },
          discoveredPlaces: ['aaa-city'],
        }),
        0,
        5,
      );
      quiz.forEach((q) => kinds.add(q.kind));
    }
    expect(kinds).toContain('borders');
    expect(kinds).toContain('region-of');
    expect(kinds).toContain('landlocked');
  });
  it('construit chaque type de question', () => {
    const rng = createRng(4);
    expect(buildQuestion(rng, 'capital-of:AAA', catalog, 'explorer')?.answer).toBe('aaa-cap');
    expect(buildQuestion(rng, 'flag-of:AAA', catalog, 'explorer')?.answer).toBe('AAA');
    expect(buildQuestion(rng, 'country-of-capital:AAA', catalog, 'explorer')?.answer).toBe('AAA');
    expect(buildQuestion(rng, 'region-of:AAA', catalog, 'geographer')?.answer).toBe('west');
    expect(buildQuestion(rng, 'city-in:aaa-city', catalog, 'geographer')?.answer).toBe('AAA');
    expect(catalog.neighbors.CCC).toContain(
      buildQuestion(rng, 'borders:CCC', catalog, 'geographer')?.answer,
    );
    expect(buildQuestion(rng, 'landlocked:DDD', catalog, 'geographer')?.answer).toBe('DDD');
  });
  it('refuse une question sans objet', () => {
    const rng = createRng(4);
    expect(buildQuestion(rng, 'capital-of:XXX', catalog, 'explorer')).toBeNull();
    expect(buildQuestion(rng, 'flag-of:XXX', catalog, 'explorer')).toBeNull();
    expect(buildQuestion(rng, 'region-of:XXX', catalog, 'explorer')).toBeNull();
    expect(buildQuestion(rng, 'city-in:xxx', catalog, 'explorer')).toBeNull();
    expect(buildQuestion(rng, 'borders:ILE', catalog, 'explorer')).toBeNull();
    expect(buildQuestion(rng, 'landlocked:AAA', catalog, 'explorer')).toBeNull();
    expect(buildQuestion(rng, 'inconnu:AAA', catalog, 'explorer')).toBeNull();
  });
});

describe('défi du jour', () => {
  it('est identique pour une même date', () => {
    expect(dailyChallenge('2026-11-05', catalog)).toEqual(dailyChallenge('2026-11-05', catalog));
  });
  it('change avec la date', () => {
    expect(dailySeed('2026-11-05')).not.toBe(dailySeed('2026-11-06'));
    const missions = new Set(
      Array.from({ length: 30 }, (_, i) =>
        JSON.stringify(dailyChallenge(`2026-11-${String(i + 1).padStart(2, '0')}`, catalog)),
      ),
    );
    expect(missions.size).toBeGreaterThan(5);
  });
  it('couvre plusieurs types de missions', () => {
    const types = new Set(
      Array.from(
        { length: 28 },
        (_, i) => dailyChallenge(`2026-10-${String(i + 1).padStart(2, '0')}`, catalog).mission.type,
      ),
    );
    expect(types.size).toBeGreaterThanOrEqual(2);
  });
  it('utilise la date UTC', () => {
    expect(utcDateKey(new Date('2026-11-05T23:59:00-05:00'))).toBe('2026-11-06');
  });
  it('échoue clairement sans capitale', () => {
    expect(() => dailyChallenge('2026-11-05', { ...catalog, places: [] })).toThrow(
      /Capitale manquante/,
    );
  });
});
