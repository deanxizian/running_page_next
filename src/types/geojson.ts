export type Position = number[];

export interface LineString {
  type: 'LineString';
  coordinates: Position[];
}

export interface Polygon {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface MultiPolygon {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

export type GeoJsonProperties = Record<string, unknown> | null;

export interface Feature<
  Geometry = LineString | Polygon | MultiPolygon,
  Properties = GeoJsonProperties,
> {
  type: 'Feature';
  properties: Properties;
  geometry: Geometry;
}

export interface FeatureCollection<
  Geometry = LineString | Polygon | MultiPolygon,
  Properties = GeoJsonProperties,
> {
  type: 'FeatureCollection';
  features: Array<Feature<Geometry, Properties>>;
}
