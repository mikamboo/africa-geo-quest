import type { Point } from './geometry';
import type { WorldModel } from './world';

/**
 * Vitesse de déplacement. Le continent mesure environ 8 000 km du nord au sud :
 * à 105 km/s, la traversée complète prend environ 76 s (cible : 60 à 90 s).
 */
export const SPEED_KM_PER_S = 105;
/** Pas de temps maximal, pour éviter un saut après un onglet resté en arrière-plan. */
export const MAX_STEP_S = 0.1;
/** Pas rapide, facultatif : pour traverser le continent sans attendre, une fois la carte connue. */
export const SPRINT_FACTOR = 2;

export type Facing = 'up' | 'down' | 'left' | 'right';

export interface InputVector {
  x: number;
  y: number;
}

/** Normalise une entrée : les diagonales ne vont pas plus vite, un joystick peut aller moins vite. */
export function normalizeInput(input: InputVector): InputVector {
  const length = Math.hypot(input.x, input.y);
  if (length === 0) return { x: 0, y: 0 };
  const scale = length > 1 ? 1 / length : 1;
  return { x: input.x * scale, y: input.y * scale };
}

export function facingFromInput(input: InputVector, fallback: Facing): Facing {
  if (input.x === 0 && input.y === 0) return fallback;
  if (Math.abs(input.x) > Math.abs(input.y)) return input.x > 0 ? 'right' : 'left';
  return input.y > 0 ? 'down' : 'up';
}

export function stepPosition(
  position: Point,
  input: InputVector,
  dtSeconds: number,
  world: Pick<WorldModel, 'clampToBounds'>,
  speedFactor = 1,
): Point {
  const direction = normalizeInput(input);
  const dt = Math.min(Math.max(dtSeconds, 0), MAX_STEP_S);
  return world.clampToBounds({
    x: position.x + direction.x * SPEED_KM_PER_S * speedFactor * dt,
    y: position.y + direction.y * SPEED_KM_PER_S * speedFactor * dt,
  });
}
