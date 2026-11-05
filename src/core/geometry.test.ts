import { describe, expect, it } from 'vitest';
import {
  bboxContains,
  bboxOfRings,
  distance,
  distanceSqToSegment,
  distanceToRing,
  pointInPolygon,
  pointInRing,
  ringArea,
  segmentsIntersect,
} from './geometry';

const square = new Float64Array([0, 0, 10, 0, 10, 10, 0, 10, 0, 0]);
const hole = new Float64Array([4, 4, 6, 4, 6, 6, 4, 6, 4, 4]);

describe('distance', () => {
  it('calcule une distance euclidienne', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
  it('vaut zéro pour un même point', () => {
    expect(distance({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
  });
});

describe('polygones', () => {
  it('détecte un point dedans et dehors', () => {
    expect(pointInRing(square, 5, 5)).toBe(true);
    expect(pointInRing(square, 15, 5)).toBe(false);
  });
  it('exclut les points situés dans un trou', () => {
    expect(pointInPolygon([square, hole], 5, 5)).toBe(false);
    expect(pointInPolygon([square, hole], 2, 2)).toBe(true);
  });
  it('gère un polygone sans anneau', () => {
    expect(pointInPolygon([], 0, 0)).toBe(false);
  });
  it("calcule l'aire et l'emprise", () => {
    expect(ringArea(square)).toBe(100);
    expect(bboxOfRings([square])).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 });
  });
  it('tient compte de la marge de bbox', () => {
    const box = bboxOfRings([square]);
    expect(bboxContains(box, 12, 5)).toBe(false);
    expect(bboxContains(box, 12, 5, 3)).toBe(true);
  });
  it('mesure la distance au contour', () => {
    expect(distanceToRing(square, 15, 5)).toBe(5);
    expect(distanceSqToSegment(0, 5, 0, 0, 0, 0)).toBe(25);
  });
});

describe('segmentsIntersect', () => {
  it('détecte un croisement', () => {
    expect(segmentsIntersect(0, 0, 10, 10, 0, 10, 10, 0)).toBe(true);
  });
  it('ignore des segments disjoints', () => {
    expect(segmentsIntersect(0, 0, 1, 1, 5, 5, 6, 4)).toBe(false);
  });
  it('compare les emprises de segments colinéaires', () => {
    expect(segmentsIntersect(0, 0, 5, 0, 4, 0, 8, 0)).toBe(true);
    expect(segmentsIntersect(0, 0, 1, 0, 4, 0, 8, 0)).toBe(false);
  });
});
