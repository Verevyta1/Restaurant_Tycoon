export type MapGridCell = readonly [row: number, column: number];

export const BOARD_GRID_SIZE = 15;
export const ROUTE_CELL_COUNT = 56;

// A 15 × 15 perimeter contains exactly 56 equal cells. Cell zero is the
// bottom-left start square, then movement continues clockwise around the board.
export const MOVE_GRID_CELLS: MapGridCell[] = Array.from(
  { length: ROUTE_CELL_COUNT },
  (_, cell): MapGridCell => {
    if (cell <= 14) return [BOARD_GRID_SIZE - cell, 1];
    if (cell <= 28) return [1, cell - 13];
    if (cell <= 42) return [cell - 27, BOARD_GRID_SIZE];
    return [BOARD_GRID_SIZE, 57 - cell];
  },
);

// Gameplay only relies on the route length. Keeping this export avoids mixing
// board presentation concerns into the turn and movement rules.
export const MOVE_POINTS = MOVE_GRID_CELLS;

export const LANDMARK_STATION_CELLS = [
  0, 13, 16, 20, 24, 30, 32, 35, 38, 3, 6, 9, 28, 33, 54, 47, 46, 43, 50, 53,
];

export const LANDMARK_COUNT = LANDMARK_STATION_CELLS.length;
export const EXTRA_ROUTE_CELLS = MOVE_GRID_CELLS.map((_, cell) => cell).filter(
  (cell) => !LANDMARK_STATION_CELLS.includes(cell),
);
export const STATION_CELLS = [...LANDMARK_STATION_CELLS, ...EXTRA_ROUTE_CELLS];
export const STATION_BY_CELL = Object.fromEntries(
  STATION_CELLS.map((cell, station) => [cell, station]),
) as Record<number, number>;
