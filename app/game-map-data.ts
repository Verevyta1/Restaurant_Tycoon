export type MapPoint = readonly [number, number];

// A hand-drawn, non-intersecting loop around the city. The game still uses 56
// movement cells; only their presentation on the map changes.
const ROUTE_ANCHORS: MapPoint[] = [
  [14, 84], [9, 70], [12, 53], [8, 38], [16, 22], [31, 14],
  [47, 18], [62, 12], [79, 18], [90, 31], [86, 45], [93, 58],
  [86, 72], [75, 78], [65, 89], [49, 84], [35, 91], [23, 82],
];

const pointOnClosedCurve = (position: number): MapPoint => {
  const count = ROUTE_ANCHORS.length;
  const segment = Math.floor(position) % count;
  const t = position - Math.floor(position);
  const p0 = ROUTE_ANCHORS[(segment - 1 + count) % count];
  const p1 = ROUTE_ANCHORS[segment];
  const p2 = ROUTE_ANCHORS[(segment + 1) % count];
  const p3 = ROUTE_ANCHORS[(segment + 2) % count];
  const curve = (a: number, b: number, c: number, d: number) =>
    0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  return [curve(p0[0], p1[0], p2[0], p3[0]), curve(p0[1], p1[1], p2[1], p3[1])];
};

export const MOVE_POINTS: MapPoint[] = Array.from({ length: 56 }, (_, index) =>
  pointOnClosedCurve((index * ROUTE_ANCHORS.length) / 56),
);

export const ROUTE_SVG_POINTS = MOVE_POINTS
  .map(([x, y]) => `${(x * 9).toFixed(1)},${(y * 9).toFixed(1)}`)
  .join(" ");

export const LANDMARK_STATION_CELLS = [
  0, 13, 16, 20, 24, 30, 32, 35, 38, 3, 6, 9, 28, 33, 54, 47, 46, 43, 50, 53,
];

export const LANDMARK_COUNT = LANDMARK_STATION_CELLS.length;
export const EXTRA_ROUTE_CELLS = MOVE_POINTS.map((_, cell) => cell).filter(
  (cell) => !LANDMARK_STATION_CELLS.includes(cell),
);
export const STATION_CELLS = [...LANDMARK_STATION_CELLS, ...EXTRA_ROUTE_CELLS];
export const STATION_BY_CELL = Object.fromEntries(
  STATION_CELLS.map((cell, station) => [cell, station]),
) as Record<number, number>;

