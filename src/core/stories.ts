import { capitalsOf, countryByCode, type GameCatalog } from './catalog';
import type { DialogueGraph, DialogueNode } from './dialogue';
import type { ProgressData } from './progress';
import type { RoomTheme } from './rooms';
import { shuffle, type Rng } from './rng';
import type { Localized, PlaceInfo } from './types';

export interface StoryQuestion {
  text: Localized;
  options: Localized[];
  answer: number;
  explanation: Localized;
}

export interface StoryStop {
  placeId: string;
  room: RoomTheme;
  clue: Localized;
  npc: { name: string; role: Localized; look: number };
  lines: Localized[];
  question: StoryQuestion;
  note: Localized;
  sourceUrl: string;
}

export interface Story {
  id: string;
  theme: string;
  title: Localized;
  intro: Localized;
  outro: Localized;
  stops: StoryStop[];
}

export interface StoryProgress {
  id: string;
  stop: number;
}

export const STORY_POINTS = 60;
export const STORY_FIRST_TRY_BONUS = 20;
export const STORY_FINAL_POINTS = 200;

export function storyById(stories: readonly Story[], id: string): Story | undefined {
  return stories.find((story) => story.id === id);
}

export function currentStop(stories: readonly Story[], run: StoryProgress): StoryStop | undefined {
  return storyById(stories, run.id)?.stops[run.stop];
}

/** Passe à l'étape suivante. Retourne `done` à la fin du reportage. */
export function advanceStory(
  stories: readonly Story[],
  run: StoryProgress,
): { run: StoryProgress | null; done: boolean } {
  const story = storyById(stories, run.id);
  if (!story || run.stop + 1 >= story.stops.length) return { run: null, done: true };
  return { run: { id: run.id, stop: run.stop + 1 }, done: false };
}

function speakerOf(stop: StoryStop): Localized {
  return {
    fr: `${stop.npc.name}, ${stop.npc.role.fr}`,
    en: `${stop.npc.name}, ${stop.npc.role.en}`,
  };
}

/**
 * Conversation d'une étape : répliques, défi sans sanction (une erreur explique et laisse repartir),
 * puis l'indice de la suite. Le drapeau `stopDone` n'est levé qu'à la fin, une seule fois.
 */
export function stopDialogue(stop: StoryStop, next: StoryStop | undefined): DialogueGraph {
  const speaker = speakerOf(stop);
  const nodes: Record<string, DialogueNode> = {};
  stop.lines.forEach((text, index) => {
    nodes[`line${index}`] = {
      speaker,
      text,
      next: index + 1 < stop.lines.length ? `line${index + 1}` : 'question',
    };
  });
  nodes.question = {
    speaker,
    text: stop.question.text,
    choices: stop.question.options.map((text, index) => ({
      text,
      to: index === stop.question.answer ? 'right' : 'wrong',
      ...(index === stop.question.answer ? { set: { firstTry: true } } : {}),
    })),
  };
  nodes.right = { speaker, text: stop.question.explanation, next: 'lead' };
  nodes.wrong = {
    speaker,
    text: {
      fr: `Pas tout à fait. ${stop.question.explanation.fr}`,
      en: `Not quite. ${stop.question.explanation.en}`,
    },
    next: 'lead',
  };
  nodes.lead = next
    ? {
        speaker,
        text: {
          fr: `Pour la suite de ton reportage, voici une piste : ${next.clue.fr}`,
          en: `For the next part of your story, here is a lead: ${next.clue.en}`,
        },
        end: true,
      }
    : {
        speaker,
        text: {
          fr: 'Tu as tout ce qu’il faut. Il est temps de publier.',
          en: 'You have everything you need. Time to publish.',
        },
        end: true,
      };
  return { start: 'line0', nodes };
}

/** Une personne présente dans le lieu dit une courte réplique, sans enjeu : la pièce vit. */
export function ambientDialogue(speaker: Localized, text: Localized): DialogueGraph {
  return { start: 'line', nodes: { line: { speaker, text, end: true } } };
}

/**
 * Accueil d'un lieu hors reportage : le guide raconte le fait du pays et pose une question
 * sur la capitale. La question vient du catalogue, donc elle existe pour les 54 pays.
 */
export function hallDialogue(
  rng: Rng,
  catalog: GameCatalog,
  place: PlaceInfo,
  fact: Localized | null,
  guide: Localized,
): DialogueGraph {
  const country = countryByCode(catalog, place.country);
  const capital = capitalsOf(catalog, place.country)[0];
  const nodes: Record<string, DialogueNode> = {};
  const welcome: Localized = {
    fr: `Bienvenue à ${place.names.fr} ! ${place.blurb?.fr ?? ''}`.trim(),
    en: `Welcome to ${place.names.en}! ${place.blurb?.en ?? ''}`.trim(),
  };
  nodes.welcome = { speaker: guide, text: welcome, next: fact ? 'fact' : 'question' };
  if (fact) nodes.fact = { speaker: guide, text: fact, next: 'question' };
  if (country && capital) {
    const others = shuffle(
      rng,
      catalog.countries
        .filter((other) => other.code !== country.code)
        .map((other) => capitalsOf(catalog, other.code)[0])
        .filter((other): other is PlaceInfo => Boolean(other)),
    ).slice(0, 2);
    const options = shuffle(rng, [capital, ...others]);
    nodes.question = {
      speaker: guide,
      text: {
        fr: `Une question pour ton carnet : quelle est la capitale de ce pays, ${country.names.fr} ?`,
        en: `A question for your notebook: what is the capital of ${country.names.en}?`,
      },
      choices: options.map((option) => ({
        text: option.names,
        to: option.id === capital.id ? 'right' : 'wrong',
        ...(option.id === capital.id ? { set: { firstTry: true } } : {}),
      })),
    };
    nodes.right = {
      speaker: guide,
      text: { fr: 'Exactement. Bonne route !', en: 'Exactly. Safe travels!' },
      end: true,
    };
    nodes.wrong = {
      speaker: guide,
      text: {
        fr: `C'est ${capital.names.fr}. Tu le retiendras pour la prochaine fois.`,
        en: `It's ${capital.names.en}. You'll remember it next time.`,
      },
      end: true,
    };
  } else {
    nodes.question = {
      speaker: guide,
      text: { fr: 'Bonne route !', en: 'Safe travels!' },
      end: true,
    };
  }
  return { start: 'welcome', nodes };
}

/** Choisit le décor d'un lieu hors reportage selon son genre, de façon stable. */
export function defaultRoomFor(place: PlaceInfo): RoomTheme {
  if (place.kind === 'capital') return 'hall';
  if (place.kind === 'monument') return 'gallery';
  if (place.kind === 'nature') return 'lab';
  return 'newsroom';
}

/** Note de carnet d'une étape : identifiant stable, pour ne la compter qu'une fois. */
export function noteId(storyId: string, stop: number): string {
  return `${storyId}:${stop}`;
}

export interface StopOutcome {
  progress: ProgressData;
  points: number;
  published: boolean;
}

/** Applique la fin d'une conversation d'étape : note, points, étape suivante ou publication. */
export function completeStop(
  progress: ProgressData,
  stories: readonly Story[],
  firstTry: boolean,
): StopOutcome {
  const run = progress.story;
  if (!run) return { progress, points: 0, published: false };
  const id = noteId(run.id, run.stop);
  if (progress.notes.includes(id)) return { progress, points: 0, published: false };
  const { run: next, done } = advanceStory(stories, run);
  const points =
    STORY_POINTS + (firstTry ? STORY_FIRST_TRY_BONUS : 0) + (done ? STORY_FINAL_POINTS : 0);
  return {
    points,
    published: done,
    progress: {
      ...progress,
      story: next,
      notes: [...progress.notes, id],
      storiesDone:
        done && !progress.storiesDone.includes(run.id)
          ? [...progress.storiesDone, run.id]
          : progress.storiesDone,
      points: progress.points + points,
    },
  };
}

/** Rejouer un reportage efface ses notes : le carnet reste juste, et les points se regagnent. */
export function startStory(progress: ProgressData, id: string): ProgressData {
  return {
    ...progress,
    story: { id, stop: 0 },
    notes: progress.notes.filter((note) => !note.startsWith(`${id}:`)),
  };
}

/** Pays à situer sur la carte murale : un voisin d'abord, sinon un pays de la même région. */
export function wallMapTarget(rng: Rng, catalog: GameCatalog, code: string): string {
  const known = new Set(catalog.countries.map((country) => country.code));
  const neighbors = (catalog.neighbors[code] ?? []).filter((other) => known.has(other));
  if (neighbors.length > 0) return neighbors[Math.floor(rng() * neighbors.length)]!;
  const region = countryByCode(catalog, code)?.region;
  const sameRegion = catalog.countries.filter((c) => c.region === region && c.code !== code);
  return sameRegion[Math.floor(rng() * sameRegion.length)]?.code ?? code;
}
