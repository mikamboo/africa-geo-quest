import { describe, expect, it } from 'vitest';
import { distance } from './geometry';

describe('distance', () => {
  it('calcule une distance euclidienne', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
  it('vaut zéro pour un même point', () => {
    expect(distance({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
  });
});
