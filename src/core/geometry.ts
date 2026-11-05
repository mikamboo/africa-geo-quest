export interface Point {
  x: number;
  y: number;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Anneau plan aplati : x0, y0, x1, y1… Compact et rapide à parcourir. */
export type Ring = Float64Array;

/** Un polygone = anneau extérieur puis trous éventuels. */
export type PlanarPolygon = Ring[];

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function emptyBBox(): BBox {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

export function extendBBox(box: BBox, x: number, y: number): void {
  if (x < box.minX) box.minX = x;
  if (x > box.maxX) box.maxX = x;
  if (y < box.minY) box.minY = y;
  if (y > box.maxY) box.maxY = y;
}

export function bboxOfRings(rings: Ring[]): BBox {
  const box = emptyBBox();
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 2) extendBBox(box, ring[i]!, ring[i + 1]!);
  }
  return box;
}

export function bboxContains(box: BBox, x: number, y: number, margin = 0): boolean {
  return (
    x >= box.minX - margin &&
    x <= box.maxX + margin &&
    y >= box.minY - margin &&
    y <= box.maxY + margin
  );
}

/** Lancer de rayon pair-impair sur un anneau. */
export function pointInRing(ring: Ring, x: number, y: number): boolean {
  let inside = false;
  const count = ring.length;
  for (let i = 0, j = count - 2; i < count; j = i, i += 2) {
    const xi = ring[i]!;
    const yi = ring[i + 1]!;
    const xj = ring[j]!;
    const yj = ring[j + 1]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(polygon: PlanarPolygon, x: number, y: number): boolean {
  const [outer, ...holes] = polygon;
  if (!outer || !pointInRing(outer, x, y)) return false;
  return !holes.some((hole) => pointInRing(hole, x, y));
}

/** Aire absolue d'un anneau (formule du lacet). */
export function ringArea(ring: Ring): number {
  let sum = 0;
  const count = ring.length;
  for (let i = 0, j = count - 2; i < count; j = i, i += 2) {
    sum += ring[j]! * ring[i + 1]! - ring[i]! * ring[j + 1]!;
  }
  return Math.abs(sum) / 2;
}

/** Distance au carré d'un point à un segment. */
export function distanceSqToSegment(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSq));
  const px = ax + t * dx - x;
  const py = ay + t * dy - y;
  return px * px + py * py;
}

/** Distance d'un point au contour (fermé) d'un anneau. */
export function distanceToRing(ring: Ring, x: number, y: number): number {
  let best = Infinity;
  const count = ring.length;
  for (let i = 0, j = count - 2; i < count; j = i, i += 2) {
    const d = distanceSqToSegment(x, y, ring[j]!, ring[j + 1]!, ring[i]!, ring[i + 1]!);
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/** Vrai si les segments [a,b] et [c,d] se coupent, points de contact inclus. */
export function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  if (d1 * d2 > 0 || d3 * d4 > 0) return false;
  if (d1 === 0 && d2 === 0) {
    // Segments colinéaires : on compare leurs emprises.
    return (
      Math.max(ax, bx) >= Math.min(cx, dx) &&
      Math.max(cx, dx) >= Math.min(ax, bx) &&
      Math.max(ay, by) >= Math.min(cy, dy) &&
      Math.max(cy, dy) >= Math.min(ay, by)
    );
  }
  return true;
}
