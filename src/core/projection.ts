import { geoAzimuthalEqualArea, type GeoProjection } from 'd3-geo';
import type { Point } from './geometry';

const EARTH_RADIUS_KM = 6371;

/**
 * Lambert azimutale équivalente centrée sur l'Afrique (ADR 0002).
 * L'échelle vaut le rayon terrestre : une unité monde vaut environ un kilomètre.
 */
export function createProjection(): GeoProjection {
  return geoAzimuthalEqualArea()
    .rotate([-20, -2])
    .scale(EARTH_RADIUS_KM)
    .translate([0, 0])
    .precision(0.1);
}

const projection = createProjection();

export function project(lon: number, lat: number): Point {
  const projected = projection([lon, lat]);
  if (!projected) throw new Error(`Coordonnées non projetables : ${lon}, ${lat}`);
  return { x: projected[0], y: projected[1] };
}

export function unproject(point: Point): { lon: number; lat: number } {
  const inverted = projection.invert?.([point.x, point.y]);
  if (!inverted) throw new Error(`Point non inversible : ${point.x}, ${point.y}`);
  return { lon: inverted[0], lat: inverted[1] };
}
