import type { InputVector } from './movement';
import { normalizeInput, MAX_STEP_S } from './movement';
import type { Point } from './geometry';

export const ROOM_THEMES = [
  'hall',
  'newsroom',
  'studio',
  'cinema',
  'library',
  'lab',
  'gallery',
  'stadium',
] as const;
export type RoomTheme = (typeof ROOM_THEMES)[number];

/**
 * Plans en grille : `#` mur, `.` sol, `D` porte, majuscules = mobilier (bloquant).
 * `1` et `2` : personnes, `M` : carte murale, `N` : panneau. Blockout d'abord, décor ensuite.
 */
export const ROOM_PLANS: Record<RoomTheme, string[]> = {
  hall: [
    '#####MM#####',
    '#T..1......#',
    '#T.........#',
    '#....CC....#',
    '#....CC...2#',
    '#.........S#',
    'N.........S#',
    '#####DD#####',
  ],
  newsroom: [
    '####N#MM####',
    '#TT......TT#',
    '#.1........#',
    '#.....TT...#',
    '#TT...TT..2#',
    '#TT........#',
    '#.........S#',
    '#####DD#####',
  ],
  studio: [
    '####MM#N####',
    '#KK......PP#',
    '#KK.1....PP#',
    '#..........#',
    '#.....CC...#',
    '#.2...CC...#',
    '#..........#',
    '#####DD#####',
  ],
  cinema: [
    '#KKKKKKKKKK#',
    '#..1.......#',
    '#.CCC..CCC.#',
    'M..........N',
    '#.CCC..CCC.#',
    '#.........2#',
    '#.CCC..CCC.#',
    '#####DD#####',
  ],
  library: [
    '#SSSS#MM#SS#',
    '#..........#',
    '#.SS.1..SS.#',
    '#.SS....SS.#',
    'N.SS....SS.#',
    '#.SS..2.SS.#',
    '#..........#',
    '#####DD#####',
  ],
  lab: [
    '####MM#N####',
    '#KK.....KK.#',
    '#TT..1..TT.#',
    '#..........#',
    '#.TTTTTT...#',
    '#.......2..#',
    '#PP........#',
    '#####DD#####',
  ],
  gallery: [
    '##N##MM#####',
    '#..........#',
    '#.CC.1..CC.#',
    '#.CC....CC.#',
    '#..........#',
    '#.CC..2.CC.#',
    '#.CC....CC.#',
    '#####DD#####',
  ],
  stadium: [
    '##N##MM#####',
    '#..........#',
    '#.GG1GGGGG.#',
    '#.GGGGGGGG.#',
    '#.GGGGGGGG.#',
    '#.GGGGGGG2.#',
    '#..........#',
    '#####DD#####',
  ],
};

export type RoomSpotKind = 'lead' | 'extra' | 'map' | 'board' | 'door';

export interface RoomSpot {
  kind: RoomSpotKind;
  x: number;
  y: number;
}

const SPOT_CODES: Record<string, RoomSpotKind> = {
  '1': 'lead',
  '2': 'extra',
  M: 'map',
  N: 'board',
  D: 'door',
};
const FLOOR = new Set(['.', 'D']);

export const ROOM_SPEED_TILES_PER_S = 3.6;
export const REACH_TILES = 1.55;
const BODY_RADIUS = 0.3;

export interface RoomLayout {
  theme: RoomTheme;
  rows: string[];
  width: number;
  height: number;
  spots: RoomSpot[];
  entry: Point;
}

export function createLayout(theme: RoomTheme): RoomLayout {
  const rows = ROOM_PLANS[theme];
  const spots: RoomSpot[] = [];
  const merged = new Set<string>();
  rows.forEach((row, y) => {
    [...row].forEach((code, x) => {
      const kind = SPOT_CODES[code];
      if (!kind) return;
      // Une porte ou une carte sur deux cases ne compte que pour un seul point d'action.
      if (merged.has(`${code}:${y}`)) return;
      merged.add(`${code}:${y}`);
      const wide = row[x + 1] === code;
      spots.push({ kind, x: x + (wide ? 1 : 0.5), y: y + 0.5 });
    });
  });
  const door = spots.find((spot) => spot.kind === 'door');
  if (!door) throw new Error(`Pièce sans porte : ${theme}`);
  return {
    theme,
    rows,
    width: rows[0]!.length,
    height: rows.length,
    spots,
    entry: { x: door.x, y: door.y - 1 },
  };
}

function isOpen(layout: RoomLayout, x: number, y: number): boolean {
  const code = layout.rows[Math.floor(y)]?.[Math.floor(x)];
  return code !== undefined && FLOOR.has(code);
}

function bodyFits(layout: RoomLayout, x: number, y: number): boolean {
  const r = BODY_RADIUS;
  return (
    isOpen(layout, x - r, y - r) &&
    isOpen(layout, x + r, y - r) &&
    isOpen(layout, x - r, y + r) &&
    isOpen(layout, x + r, y + r)
  );
}

/** Déplacement axe par axe : le personnage glisse le long des meubles au lieu de s'y coller. */
export function stepInRoom(
  layout: RoomLayout,
  position: Point,
  input: InputVector,
  dtSeconds: number,
): Point {
  const direction = normalizeInput(input);
  const dt = Math.min(Math.max(dtSeconds, 0), MAX_STEP_S);
  const nextX = position.x + direction.x * ROOM_SPEED_TILES_PER_S * dt;
  const x = bodyFits(layout, nextX, position.y) ? nextX : position.x;
  const nextY = position.y + direction.y * ROOM_SPEED_TILES_PER_S * dt;
  const y = bodyFits(layout, x, nextY) ? nextY : position.y;
  return { x, y };
}

export function nearestSpot(layout: RoomLayout, position: Point): RoomSpot | null {
  let best: RoomSpot | null = null;
  let bestDistance = REACH_TILES;
  for (const spot of layout.spots) {
    const distance = Math.hypot(spot.x - position.x, spot.y - position.y);
    if (distance <= bestDistance) {
      best = spot;
      bestDistance = distance;
    }
  }
  return best;
}

/** Cases de sol accessibles depuis l'entrée : garantit qu'aucun plan ne bloque le joueur. */
export function reachableTiles(layout: RoomLayout): Set<string> {
  const start = { x: Math.floor(layout.entry.x), y: Math.floor(layout.entry.y) };
  const seen = new Set<string>([`${start.x},${start.y}`]);
  const queue = [start];
  while (queue.length > 0) {
    const { x, y } = queue.pop()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const key = `${x + dx},${y + dy}`;
      if (!seen.has(key) && isOpen(layout, x + dx + 0.5, y + dy + 0.5)) {
        seen.add(key);
        queue.push({ x: x + dx, y: y + dy });
      }
    }
  }
  return seen;
}

/** Vrai si le joueur peut arriver à portée de ce point d'action. */
export function spotIsReachable(layout: RoomLayout, spot: RoomSpot): boolean {
  for (const key of reachableTiles(layout)) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    if (Math.hypot(x + 0.5 - spot.x, y + 0.5 - spot.y) <= REACH_TILES) return true;
  }
  return false;
}
