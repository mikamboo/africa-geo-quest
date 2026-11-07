import { project } from '../core/projection';
import type { GameData } from '../data/gameData';

/** Contour d'un pays seul, cadré pour une question « reconnais cette forme ». */
export function countryShape(data: GameData, code: string): { d: string; viewBox: string } | null {
  const country = data.countries.find((candidate) => candidate.code === code);
  if (!country) return null;
  const rings = country.polygons.map((polygon) =>
    polygon[0]!.map((position) => project(position[0]!, position[1]!)),
  );
  const points = rings.flat();
  const minX = Math.min(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxX = Math.max(...points.map((p) => p.x));
  const maxY = Math.max(...points.map((p) => p.y));
  const margin = Math.max(maxX - minX, maxY - minY) * 0.06;
  return {
    d: rings
      .map((ring) => `M${ring.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}Z`)
      .join(''),
    viewBox: `${minX - margin} ${minY - margin} ${maxX - minX + margin * 2} ${maxY - minY + margin * 2}`,
  };
}
