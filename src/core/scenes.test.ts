import { describe, expect, it } from 'vitest';
import {
  advanceDialogue,
  chooseDialogue,
  currentNode,
  startDialogue,
  validateDialogue,
  type DialogueGraph,
} from './dialogue';
import {
  createLayout,
  nearestSpot,
  reachableTiles,
  ROOM_THEMES,
  spotIsReachable,
  stepInRoom,
} from './rooms';
import {
  advanceStory,
  completeStop,
  startStory,
  STORY_FIRST_TRY_BONUS,
  STORY_POINTS,
  STORY_FINAL_POINTS,
  wallMapTarget,
  ambientDialogue,
  currentStop,
  defaultRoomFor,
  hallDialogue,
  stopDialogue,
  storyById,
  type Story,
  type StoryStop,
} from './stories';
import { createInitialProgress } from './progress';
import { createRng } from './rng';
import { createTestWorld } from './testing';

const l = (text: string) => ({ fr: text, en: text });

const stop = (id: string): StoryStop => ({
  placeId: id,
  room: 'studio',
  clue: l(`indice ${id}`),
  npc: { name: 'Awa', role: l('ingénieure'), look: 1 },
  lines: [l('un'), l('deux')],
  question: { text: l('q'), options: [l('a'), l('b'), l('c')], answer: 1, explanation: l('car') },
  note: l('note'),
  sourceUrl: 'https://example.org',
});
const stories: Story[] = [
  {
    id: 's',
    theme: 's',
    title: l('T'),
    intro: l('I'),
    outro: l('O'),
    stops: [stop('p1'), stop('p2')],
  },
];

describe('dialogue', () => {
  const graph: DialogueGraph = {
    start: 'a',
    nodes: {
      a: { text: l('a'), next: 'b' },
      b: { text: l('b'), choices: [{ text: l('x'), to: 'c', set: { flag: true } }] },
      c: { text: l('c'), end: true },
    },
  };

  it('avance puis termine', () => {
    let state = startDialogue(graph);
    state = advanceDialogue(graph, state);
    expect(currentNode(graph, state).text.fr).toBe('b');
    expect(advanceDialogue(graph, state)).toBe(state);
    state = chooseDialogue(graph, state, 0);
    expect(state.flags.flag).toBe(true);
    state = advanceDialogue(graph, state);
    expect(state.finished).toBe(true);
  });
  it('ignore un choix inexistant', () => {
    const state = startDialogue(graph);
    expect(chooseDialogue(graph, state, 5)).toBe(state);
  });
  it('signale un nœud inconnu', () => {
    expect(() => currentNode(graph, { current: 'zz', flags: {}, finished: false })).toThrow();
  });
  it('accepte un graphe sain', () => {
    expect(validateDialogue(graph)).toEqual([]);
  });
  it('repère impasse, cible absente, nœud isolé et départ absent', () => {
    const broken: DialogueGraph = {
      start: 'nope',
      nodes: {
        a: { text: l('a') },
        b: { text: l('b'), next: 'zz' },
      },
    };
    const errors = validateDialogue(broken).join(' ');
    expect(errors).toContain('Départ absent');
    expect(errors).toContain('Nœud sans issue : a');
    expect(errors).toContain('Cible absente');
    expect(errors).toContain('inatteignable');
  });
});

describe('pièces', () => {
  it('ont toutes une porte, deux personnes, une carte et un panneau', () => {
    for (const theme of ROOM_THEMES) {
      const kinds = createLayout(theme).spots.map((spot) => spot.kind);
      for (const kind of ['door', 'lead', 'extra', 'map', 'board']) {
        expect(kinds, `${theme} ${kind}`).toContain(kind);
      }
    }
  });
  it('ont des plans rectangulaires', () => {
    for (const theme of ROOM_THEMES) {
      const { rows, width } = createLayout(theme);
      for (const row of rows) expect(row.length, theme).toBe(width);
    }
  });
  it('rendent tous les points d’action atteignables depuis la porte', () => {
    for (const theme of ROOM_THEMES) {
      const layout = createLayout(theme);
      expect(reachableTiles(layout).size, theme).toBeGreaterThan(10);
      for (const spot of layout.spots) {
        expect(spotIsReachable(layout, spot), `${theme} ${spot.kind}`).toBe(true);
      }
    }
  });
  it('bloque les murs et les meubles, et laisse glisser', () => {
    const layout = createLayout('hall');
    let position = { ...layout.entry };
    for (let t = 0; t < 8; t += 0.05) position = stepInRoom(layout, position, { x: 0, y: 1 }, 0.05);
    expect(position.y).toBeLessThan(layout.height);
    let sliding = { x: 8.5, y: 5.5 };
    const before = sliding.y;
    for (let t = 0; t < 1; t += 0.05) sliding = stepInRoom(layout, sliding, { x: -1, y: 1 }, 0.05);
    expect(sliding.y).not.toBe(before);
  });
  it('ne bouge pas sans entrée et plafonne le pas de temps', () => {
    const layout = createLayout('hall');
    expect(stepInRoom(layout, layout.entry, { x: 0, y: 0 }, 1)).toEqual(layout.entry);
    const moved = stepInRoom(layout, { x: 6, y: 4 }, { x: 1, y: 0 }, 50);
    expect(moved.x - 6).toBeLessThan(0.5);
  });
  it('trouve le point d’action à portée', () => {
    const layout = createLayout('hall');
    const lead = layout.spots.find((spot) => spot.kind === 'lead')!;
    expect(nearestSpot(layout, { x: lead.x + 0.5, y: lead.y })?.kind).toBe('lead');
    expect(nearestSpot(layout, { x: 8.5, y: 3.5 })).toBeNull();
  });
  it('refuse un plan sans porte', () => {
    expect(() => createLayout('inconnu' as 'hall')).toThrow();
  });
});

describe('reportages', () => {
  it('suit les étapes jusqu’à la publication', () => {
    const first = { id: 's', stop: 0 };
    expect(currentStop(stories, first)?.placeId).toBe('p1');
    const step = advanceStory(stories, first);
    expect(step).toEqual({ run: { id: 's', stop: 1 }, done: false });
    expect(advanceStory(stories, step.run!)).toEqual({ run: null, done: true });
  });
  it('tolère un reportage disparu', () => {
    expect(storyById(stories, 'x')).toBeUndefined();
    expect(currentStop(stories, { id: 'x', stop: 0 })).toBeUndefined();
    expect(advanceStory(stories, { id: 'x', stop: 0 }).done).toBe(true);
  });
  it('bâtit une conversation d’étape saine, avec l’indice suivant', () => {
    const graph = stopDialogue(stop('p1'), stop('p2'));
    expect(validateDialogue(graph)).toEqual([]);
    expect(graph.nodes.lead?.text.fr).toContain('indice p2');
  });
  it('ne sanctionne pas une erreur : elle explique et mène à la même piste', () => {
    const graph = stopDialogue(stop('p1'), undefined);
    expect(validateDialogue(graph)).toEqual([]);
    let state = startDialogue(graph);
    state = advanceDialogue(graph, advanceDialogue(graph, state));
    const wrong = chooseDialogue(graph, state, 0);
    expect(currentNode(graph, wrong).text.fr).toContain('car');
    expect(wrong.flags.firstTry).toBeUndefined();
    expect(currentNode(graph, advanceDialogue(graph, wrong)).end).toBe(true);
    expect(chooseDialogue(graph, state, 1).flags.firstTry).toBe(true);
  });
  it('bâtit un accueil sain pour un lieu ordinaire', () => {
    const { catalog } = createTestWorld();
    const place = catalog.places.find((p) => p.id === 'aaa-cap')!;
    const withFact = hallDialogue(createRng(1), catalog, place, l('fait'), l('Guide'));
    expect(validateDialogue(withFact)).toEqual([]);
    expect(withFact.nodes.fact?.text.fr).toBe('fait');
    const noFact = hallDialogue(createRng(1), catalog, place, null, l('Guide'));
    expect(validateDialogue(noFact)).toEqual([]);
    expect(noFact.nodes.fact).toBeUndefined();
    const lost = hallDialogue(createRng(1), catalog, { ...place, country: 'ZZZ' }, null, l('G'));
    expect(validateDialogue(lost)).toEqual([]);
  });
  it('propose la bonne capitale parmi les réponses de l’accueil', () => {
    const { catalog } = createTestWorld();
    const place = catalog.places.find((p) => p.id === 'aaa-cap')!;
    const graph = hallDialogue(createRng(2), catalog, place, null, l('G'));
    const choices = graph.nodes.question?.choices ?? [];
    expect(choices.filter((c) => c.to === 'right')).toHaveLength(1);
    expect(choices.find((c) => c.to === 'right')?.text.fr).toBe('aaa-cap');
  });
  it('note une étape une seule fois, avec bonus au premier essai', () => {
    const base = startStory(createInitialProgress(), 's');
    const first = completeStop(base, stories, true);
    expect(first.points).toBe(STORY_POINTS + STORY_FIRST_TRY_BONUS);
    expect(first.published).toBe(false);
    expect(first.progress.story).toEqual({ id: 's', stop: 1 });
    expect(first.progress.notes).toEqual(['s:0']);
    const again = completeStop({ ...first.progress, story: { id: 's', stop: 0 } }, stories, true);
    expect(again.points).toBe(0);
  });
  it('publie à la dernière étape, sans sanction si le premier essai échoue', () => {
    const base = { ...createInitialProgress(), story: { id: 's', stop: 1 } };
    const last = completeStop(base, stories, false);
    expect(last.published).toBe(true);
    expect(last.points).toBe(STORY_POINTS + STORY_FINAL_POINTS);
    expect(last.progress.story).toBeNull();
    expect(last.progress.storiesDone).toEqual(['s']);
    const replay = startStory(last.progress, 's');
    expect(replay.notes).toEqual([]);
    expect(replay.storiesDone).toEqual(['s']);
    const finishedAgain = completeStop(
      { ...last.progress, notes: [], story: { id: 's', stop: 1 } },
      stories,
      true,
    );
    expect(finishedAgain.progress.storiesDone).toEqual(['s']);
  });
  it('ne fait rien sans reportage en cours', () => {
    const progress = createInitialProgress();
    expect(completeStop(progress, stories, true)).toEqual({
      progress,
      points: 0,
      published: false,
    });
  });
  it('choisit un voisin à situer, sinon un pays de la région', () => {
    const { catalog } = createTestWorld();
    expect(catalog.neighbors.CCC).toContain(wallMapTarget(createRng(1), catalog, 'CCC'));
    const island = wallMapTarget(createRng(1), catalog, 'ILE');
    expect(catalog.countries.find((c) => c.code === island)?.region).toBe('east');
    expect(wallMapTarget(createRng(1), { ...catalog, countries: [] }, 'ZZZ')).toBe('ZZZ');
  });
  it('a une conversation d’ambiance valide', () => {
    expect(validateDialogue(ambientDialogue(l('X'), l('Y')))).toEqual([]);
  });
  it('choisit un décor selon le genre du lieu', () => {
    const { catalog } = createTestWorld();
    const place = catalog.places[0]!;
    expect(defaultRoomFor({ ...place, kind: 'capital' })).toBe('hall');
    expect(defaultRoomFor({ ...place, kind: 'monument' })).toBe('gallery');
    expect(defaultRoomFor({ ...place, kind: 'nature' })).toBe('lab');
    expect(defaultRoomFor({ ...place, kind: 'city' })).toBe('newsroom');
  });
});
