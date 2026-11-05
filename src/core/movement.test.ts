import { describe, expect, it } from 'vitest';
import {
  facingFromInput,
  MAX_STEP_S,
  normalizeInput,
  SPEED_KM_PER_S,
  stepPosition,
} from './movement';
import { Explorer } from './explorer';
import { createTestWorld } from './testing';
import { project } from './projection';

const { world } = createTestWorld();

describe('déplacement', () => {
  it('ne va pas plus vite en diagonale', () => {
    const { x, y } = normalizeInput({ x: 1, y: 1 });
    expect(Math.hypot(x, y)).toBeCloseTo(1);
  });
  it('garde une vitesse partielle au joystick', () => {
    expect(normalizeInput({ x: 0.5, y: 0 })).toEqual({ x: 0.5, y: 0 });
    expect(normalizeInput({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
  it('choisit la direction dominante', () => {
    expect(facingFromInput({ x: 1, y: 0 }, 'up')).toBe('right');
    expect(facingFromInput({ x: -1, y: 0.2 }, 'up')).toBe('left');
    expect(facingFromInput({ x: 0, y: 1 }, 'up')).toBe('down');
    expect(facingFromInput({ x: 0, y: -1 }, 'down')).toBe('up');
    expect(facingFromInput({ x: 0, y: 0 }, 'left')).toBe('left');
  });
  it('plafonne le pas de temps', () => {
    const next = stepPosition({ x: 0, y: 0 }, { x: 1, y: 0 }, 10, world);
    expect(next.x).toBeCloseTo(SPEED_KM_PER_S * MAX_STEP_S);
  });
  it('ignore un temps négatif', () => {
    expect(stepPosition({ x: 0, y: 0 }, { x: 1, y: 0 }, -1, world).x).toBe(0);
  });
  it('règle la traversée nord-sud réelle entre 60 et 90 s', () => {
    const north = project(10, 37.3);
    const south = project(20, -34.8);
    const seconds = Math.abs(south.y - north.y) / SPEED_KM_PER_S;
    expect(seconds).toBeGreaterThanOrEqual(60);
    expect(seconds).toBeLessThanOrEqual(90);
  });
});

describe('Explorer', () => {
  const walk = (explorer: Explorer, x: number, y: number, seconds: number) => {
    const events = [];
    for (let t = 0; t < seconds; t += 0.05) events.push(...explorer.update({ x, y }, 0.05));
    return events;
  };

  it('annonce le pays de départ', () => {
    const explorer = new Explorer(world, { x: 500, y: 100 }, 'explorer');
    expect(explorer.initialEvents()).toEqual([
      { type: 'country-entered', code: 'BBB', from: null },
    ]);
  });
  it("n'annonce aucun pays au départ en mer", () => {
    expect(new Explorer(world, { x: 1500, y: 0 }, 'explorer').initialEvents()).toEqual([]);
  });
  it('détecte un changement de pays, le passage terre-eau et le fleuve', () => {
    const explorer = new Explorer(world, { x: 900, y: 0 }, 'explorer');
    const west = walk(explorer, -1, 0, 9);
    expect(west).toContainEqual({ type: 'river-crossed', id: 'grand' });
    expect(west).toContainEqual({ type: 'country-entered', code: 'AAA', from: 'BBB' });
    expect(west).toContainEqual({ type: 'country-left', code: 'BBB' });
    const east = walk(new Explorer(world, { x: 900, y: 0 }, 'explorer'), 1, 0, 2);
    expect(east).toContainEqual({ type: 'terrain-changed', terrain: 'water' });
  });
  it('atteint un lieu une seule fois tant qu’on y reste, à nouveau en revenant', () => {
    const explorer = new Explorer(world, { x: -400, y: -100 }, 'explorer');
    const first = walk(explorer, 0, 1, 1);
    expect(first.filter((e) => e.type === 'place-reached')).toHaveLength(1);
    expect(walk(explorer, 0, 0, 0.5).filter((e) => e.type === 'place-reached')).toHaveLength(0);
    walk(explorer, 0, 1, 2);
    const back = walk(explorer, 0, -1, 2);
    expect(back.filter((e) => e.type === 'place-reached')).toHaveLength(1);
  });
  it('annonce l’entrée sur un lac une seule fois, puis à nouveau en y revenant', () => {
    const explorer = new Explorer(world, { x: -300, y: -500 }, 'explorer');
    const lakes = (seconds: number, y: number) =>
      walk(explorer, 0, y, seconds).filter((event) => event.type === 'lake-entered');
    expect(lakes(2, 1)).toEqual([{ type: 'lake-entered', id: 'lac' }]);
    expect(lakes(0.5, 1)).toEqual([]);
    expect(lakes(2, 1)).toEqual([]);
    expect(lakes(2, -1)).toEqual([{ type: 'lake-entered', id: 'lac' }]);
  });
  it('ne détecte pas à chaque image', () => {
    const explorer = new Explorer(world, { x: 900, y: 0 }, 'explorer');
    expect(explorer.update({ x: 0, y: 0 }, 0.01)).toEqual([]);
    expect(explorer.moving).toBe(false);
  });
  it('téléporte sans traverser de fleuve', () => {
    const explorer = new Explorer(world, { x: 500, y: 0 }, 'explorer');
    const events = explorer.teleport({ x: 700, y: 0 });
    expect(events.some((e) => e.type === 'river-crossed')).toBe(false);
    const toIsland = explorer.teleport({ x: 3000, y: 0 });
    expect(toIsland).toContainEqual({ type: 'country-entered', code: 'ILE', from: 'BBB' });
  });
  it('rend une île atteignable en pirogue', () => {
    const explorer = new Explorer(world, { x: 900, y: 0 }, 'explorer');
    const events = walk(explorer, 1, 0, 22);
    expect(events).toContainEqual({ type: 'country-entered', code: 'ILE', from: null });
  });
});
