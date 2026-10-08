export type HouseStyle = 'eclectic';
export type RoofType = 'mansard' | 'gable' | 'hipped';

export interface HouseConfig {
  style: HouseStyle;
  floors: number;
  axes: number;
  widthM: number;
  floorHeightsM: number[];
  balconyFloors: number[];
  hasAttic: boolean;
  roofType: RoofType;
  seed: number;
}

export const METER_TO_PX = 22;

export interface Palette {
  wall: number;
  wallLight: number;
  wallUpper: number;
  rust: number;
  rustDark: number;
  basement: number;
  brick: number;
  brickLight: number;
  brickDark: number;
  roof: number;
  roofHighlight: number;
  windowFrame: number;
  windowGlass: number;
  windowGlassHighlight: number;
  iron: number;
  ironHighlight: number;
  gold: number;
  door: number;
  snow: number;
  sidewalk: number;
  sidewalkJoint: number;
  curb: number;
  curbLight: number;
  roadway: number;
  roadwayDark: number;
  roadwayHighlight: number;
}

export const DEFAULT_CONFIG: HouseConfig = {
  style: 'eclectic',
  floors: 4,
  axes: 5,
  widthM: 20,
  floorHeightsM: [2.5, 4.0, 3.6, 3.2, 2.9],
  balconyFloors: [2],
  hasAttic: false,
  roofType: 'hipped',
  seed: 42,
};
