import type { Localized } from './types';

/**
 * Conversation sous forme de graphe de données : un petit moteur plutôt qu'un langage.
 * `set` s'applique sur la transition, une seule fois, même si un nœud est revisité.
 */
export interface DialogueChoice {
  text: Localized;
  to: string;
  set?: Record<string, boolean>;
}

export interface DialogueNode {
  speaker?: Localized;
  text: Localized;
  next?: string;
  choices?: DialogueChoice[];
  end?: boolean;
}

export interface DialogueGraph {
  start: string;
  nodes: Record<string, DialogueNode>;
}

export interface DialogueState {
  current: string;
  flags: Record<string, boolean>;
  finished: boolean;
}

export function startDialogue(graph: DialogueGraph): DialogueState {
  return { current: graph.start, flags: {}, finished: false };
}

export function currentNode(graph: DialogueGraph, state: DialogueState): DialogueNode {
  const node = graph.nodes[state.current];
  if (!node) throw new Error(`Nœud de dialogue inconnu : ${state.current}`);
  return node;
}

/** Avance d'une ligne sans choix. Un nœud final termine la conversation. */
export function advanceDialogue(graph: DialogueGraph, state: DialogueState): DialogueState {
  const node = currentNode(graph, state);
  if (node.choices?.length) return state;
  if (node.next) return { ...state, current: node.next };
  return { ...state, finished: true };
}

export function chooseDialogue(
  graph: DialogueGraph,
  state: DialogueState,
  index: number,
): DialogueState {
  const choice = currentNode(graph, state).choices?.[index];
  if (!choice) return state;
  return { ...state, current: choice.to, flags: { ...state.flags, ...choice.set } };
}

/** Retourne les défauts du graphe : cibles absentes, nœuds morts, nœuds inatteignables. */
export function validateDialogue(graph: DialogueGraph): string[] {
  const errors: string[] = [];
  if (!graph.nodes[graph.start]) errors.push(`Départ absent : ${graph.start}`);
  for (const [id, node] of Object.entries(graph.nodes)) {
    const targets = [...(node.next ? [node.next] : []), ...(node.choices ?? []).map((c) => c.to)];
    if (targets.length === 0 && !node.end) errors.push(`Nœud sans issue : ${id}`);
    for (const target of targets) {
      if (!graph.nodes[target]) errors.push(`Cible absente : ${id} -> ${target}`);
    }
  }
  const seen = new Set<string>();
  const queue = [graph.start];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = graph.nodes[id];
    if (node?.next) queue.push(node.next);
    node?.choices?.forEach((choice) => queue.push(choice.to));
  }
  for (const id of Object.keys(graph.nodes)) {
    if (!seen.has(id)) errors.push(`Nœud inatteignable : ${id}`);
  }
  return errors;
}
