export enum ZoneType {
  EMPTY = 'empty',
  ROAD = 'road',
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
}

export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
  type: ZoneType;
  sprite: string;
  name?: string;
}

export interface RoadCell {
  x: number;
  y: number;
  trafficWeight?: number; // Higher weight = more likely to spawn traffic
}

export type CityGrid = ReadonlyArray<ReadonlyArray<ZoneType>>;
