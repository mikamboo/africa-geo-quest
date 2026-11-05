import type { RegionId } from '../core/types';

export const OCEAN = 0x2b86ab;
export const OCEAN_DEEP = 0x2479a0;
export const CONTEXT_LAND = 0xd8cfba;
export const LAKE = 0x3d9bc2;
export const RIVER = 0x1f7ea6;
export const BORDER = 0x2a1a12;
export const INK = 0x2a1a12;
export const PAPER = 0xfff6e3;
export const TERRE = 0xb5381f;
export const OCRE = 0xe39a1e;
export const NON_STATE = 0xcfc4ae;

/** Une couleur franche par région : un pays visité la révèle. */
export const REGION_COLORS: Record<RegionId, number> = {
  north: 0xf0c05a,
  west: 0xe58a3c,
  central: 0x7fae4e,
  east: 0xd9633f,
  south: 0xc99a4b,
};

/** Couleur d'un pays pas encore visité : la teinte de sa région, lavée de sable. */
export function washed(color: number, amount = 0.62): number {
  const sand = { r: 0xf7, g: 0xe9, b: 0xcc };
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (a: number, c: number): number => Math.round(a * (1 - amount) + c * amount);
  return (mix(r, sand.r) << 16) | (mix(g, sand.g) << 8) | mix(b, sand.b);
}
