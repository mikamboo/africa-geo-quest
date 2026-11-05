import { feature } from 'topojson-client';
import type { MultiPolygon, Polygon, Position } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { CountryGeometry } from '../core/types';

export type WorldTopology = Topology<{
  countries: GeometryCollection<{ code: string }>;
  context: GeometryCollection;
}>;

function polygonsOf(geometry: Polygon | MultiPolygon): Position[][][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

/** Décode le TopoJSON en géométries [lon, lat] exploitables par `core/`. */
export function decodeBorders(topology: WorldTopology): {
  countries: CountryGeometry[];
  context: Position[][][];
} {
  const countries = feature(topology, topology.objects.countries).features.map((item) => ({
    code: item.properties.code,
    polygons: polygonsOf(item.geometry as Polygon | MultiPolygon),
  }));
  const context = feature(topology, topology.objects.context).features.flatMap((item) =>
    polygonsOf(item.geometry as Polygon | MultiPolygon),
  );
  return { countries, context };
}
