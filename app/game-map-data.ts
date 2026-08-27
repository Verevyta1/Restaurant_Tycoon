export type LabelOffset = readonly [x: number, y: number];

export type MapRoutePoint = {
  readonly x: number;
  readonly y: number;
  readonly label: LabelOffset;
  readonly tilt: number;
};

export const ROUTE_CELL_COUNT = 24;

// A short, continuous loop shaped after the supplied hand-drawn reference.
// Coordinates are percentages of the board, so movement and visuals share one
// source of truth without coupling game rules to pixel measurements.
export const MOVE_POINTS: MapRoutePoint[] = [
  { x: 12, y: 50, label: [0, 65], tilt: -2 },
  { x: 14, y: 38, label: [-72, 0], tilt: 2 },
  { x: 21, y: 26, label: [-70, -2], tilt: -1 },
  { x: 31, y: 22, label: [0, -60], tilt: 2 },
  { x: 42, y: 23, label: [0, 61], tilt: -2 },
  { x: 52, y: 19, label: [0, -60], tilt: 1 },
  { x: 63, y: 13, label: [0, 59], tilt: -1 },
  { x: 74, y: 13, label: [0, -57], tilt: 2 },
  { x: 80, y: 18, label: [-70, 80], tilt: -2 },
  { x: 83, y: 28, label: [76, -10], tilt: 1 },
  { x: 82, y: 39, label: [76, 0], tilt: -1 },
  { x: 77, y: 48, label: [76, 0], tilt: 2 },
  { x: 73, y: 57, label: [-76, 0], tilt: -2 },
  { x: 79, y: 64, label: [76, 0], tilt: 1 },
  { x: 83, y: 72, label: [76, 0], tilt: -1 },
  { x: 83, y: 81, label: [76, 0], tilt: 2 },
  { x: 77, y: 88, label: [80, 0], tilt: -2 },
  { x: 68, y: 90, label: [0, -60], tilt: 1 },
  { x: 60, y: 86, label: [-80, 40], tilt: -1 },
  { x: 57, y: 79, label: [-76, 0], tilt: 2 },
  { x: 61, y: 72, label: [76, 0], tilt: -2 },
  { x: 64, y: 64, label: [-76, 0], tilt: 1 },
  { x: 52, y: 54, label: [0, -60], tilt: -1 },
  { x: 32, y: 62, label: [0, 64], tilt: 2 },
];

export const LANDMARK_STATION_CELLS = [0, 2, 5, 7, 10, 12, 15, 17, 20, 22];
export const LANDMARK_COUNT = LANDMARK_STATION_CELLS.length;
export const EXTRA_ROUTE_CELLS = MOVE_POINTS.map((_, cell) => cell).filter(
  (cell) => !LANDMARK_STATION_CELLS.includes(cell),
);
export const STATION_CELLS = [...LANDMARK_STATION_CELLS, ...EXTRA_ROUTE_CELLS];
export const STATION_BY_CELL = Object.fromEntries(
  STATION_CELLS.map((cell, station) => [cell, station]),
) as Record<number, number>;
