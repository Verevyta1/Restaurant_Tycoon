import type { CSSProperties, ReactNode } from "react";
import { MOVE_GRID_CELLS } from "./game-map-data";

type DevelopmentView = { kind: "house" | "hotel" | "shop"; level: number };
type StationView = {
  cell: number;
  detail: string;
  development?: DevelopmentView;
  name: string;
  ownerColor?: string;
  stripe: string;
  type: "start" | "property" | "event" | "stock" | "bonus";
};
type PlayerView = { active: boolean; color: string; name: string; number: number; pos: number };

const CORNER_CELLS = new Set([0, 14, 28, 42]);
const PAWN_OFFSETS = [
  ["-12px", "-12px"],
  ["12px", "-12px"],
  ["-12px", "12px"],
  ["12px", "12px"],
] as const;

const upgradeSprite = (level: number) => {
  if (level <= 1) return "/property-upgrade-1.png";
  if (level >= 5) return "/property-upgrade-3.png";
  return "/property-upgrade-2.png";
};

const gridStyle = (cell: number): CSSProperties => {
  const [row, column] = MOVE_GRID_CELLS[cell] ?? MOVE_GRID_CELLS[0];
  return { gridRow: row, gridColumn: column };
};

export function GameBoard({ children, lang, players, stations }: {
  children: ReactNode;
  lang: "zh" | "en";
  players: PlayerView[];
  stations: StationView[];
}) {
  return <div className="game-board-shell">
    <div className="game-board-map">
      <div aria-hidden="true" className="board-empty-center" />

      {stations.map((station) => <button
        aria-label={`${station.name} · ${station.detail}`}
        className={`board-stop ${station.type} ${station.ownerColor ? "owned" : ""} ${CORNER_CELLS.has(station.cell) ? "corner-cell" : ""}`}
        key={`${station.cell}-${station.name}`}
        style={{
          ...gridStyle(station.cell),
          "--owner-color": station.ownerColor ?? "transparent",
          "--station-color": station.stripe,
        } as CSSProperties}
        title={`${station.name} · ${station.detail}`}
        type="button"
      >
        <span className="board-stop-copy">
          <b>{station.name}</b>
          <small>{station.detail}</small>
        </span>
        {station.type === "start" && <span className="start-marker">START</span>}
        {station.development && <span className={`board-development ${station.development.kind}`}>
          <span
            aria-hidden="true"
            className="upgrade-art"
            style={{ backgroundImage: `url(${upgradeSprite(station.development.level)})` }}
          />
          <b>{station.development.level}</b>
        </span>}
      </button>)}

      <div aria-label={lang === "zh" ? "玩家位置" : "Player positions"} className="board-pawns">
        {players.map((player) => {
          const [x, y] = PAWN_OFFSETS[(player.number - 1) % PAWN_OFFSETS.length];
          return <span
            aria-label={`${player.name}${player.active ? (lang === "zh" ? "，当前回合" : ", current turn") : ""}`}
            className={`board-pawn ${player.active ? "active" : ""}`}
            key={player.number}
            style={{
              ...gridStyle(player.pos),
              "--pawn-color": player.color,
              "--pawn-x": x,
              "--pawn-y": y,
            } as CSSProperties}
            title={player.name}
          />;
        })}
      </div>
    </div>

    <div className="game-board-controls">{children}</div>
  </div>;
}
