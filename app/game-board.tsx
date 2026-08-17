import type { CSSProperties, ReactNode } from "react";
import { LANDMARK_COUNT, MOVE_POINTS, ROUTE_SVG_POINTS } from "./game-map-data";

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

const LANDMARK_ART = [
  [2, 1], [1, 1], [0, 1], [4, 0], "chinatown", "extra-0", "extra-1", [3, 0],
  "extra-2", [1, 3], [4, 3], "extra-3", [3, 1], [1, 2], [0, 2], "extra-4",
  [1, 0], [4, 1], [3, 2], [3, 3],
] as const;

function LandmarkArt({ index }: { index: number }) {
  const art = LANDMARK_ART[index];
  if (art === "chinatown") return <span aria-hidden="true" className="board-landmark-art chinatown-art" />;
  if (typeof art === "string") {
    return <span aria-hidden="true" className="board-landmark-art extra-art" style={{ "--extra-col": Number(art.slice(-1)) } as CSSProperties} />;
  }
  return <span aria-hidden="true" className="board-landmark-art" style={{ "--icon-col": art[0], "--icon-row": art[1] } as CSSProperties} />;
}

export function GameBoard({ children, lang, players, stations }: {
  children: ReactNode;
  lang: "zh" | "en";
  players: PlayerView[];
  stations: StationView[];
}) {
  return <div className="game-board-map">
    <svg aria-hidden="true" className="board-illustration" viewBox="0 0 900 900">
      <path className="board-river" d="M238 565 C330 515 385 620 475 563 S630 500 711 544" />
      <path className="board-river-detail" d="M238 565 C330 515 385 620 475 563 S630 500 711 544" />
      <polyline className="board-route-shadow" points={ROUTE_SVG_POINTS} />
      <polyline className="board-route" points={ROUTE_SVG_POINTS} />
      <polyline className="board-route-stitch" points={ROUTE_SVG_POINTS} />
    </svg>

    <div className="board-title">
      <small>{lang === "zh" ? "伦敦财富之旅" : "CITY OF FORTUNE"}</small>
      <b>LONDON</b><strong>TYCOON</strong>
      <em>{lang === "zh" ? "沿伦敦奇遇小径漫游" : "FOLLOW THE LONDON TRAIL"}</em>
    </div>

    {stations.map((station, index) => {
      const [x, y] = MOVE_POINTS[station.cell];
      const landmark = index < LANDMARK_COUNT;
      const radius = Math.hypot(x - 50, y - 50) || 1;
      const landmarkOffset = landmark ? (index % 2 ? 3.2 : -1.8) : 0;
      const displayX = x + ((x - 50) / radius) * landmarkOffset;
      const displayY = y + ((y - 50) / radius) * landmarkOffset;
      return <button
        aria-label={`${station.name} · ${station.detail}`}
        className={`board-stop ${landmark ? "landmark-stop" : "street-stop"} ${station.type} ${station.ownerColor ? "owned" : ""}`}
        key={`${station.cell}-${station.name}`}
        style={{
          left: `${displayX}%`, top: `${displayY}%`, "--owner-color": station.ownerColor ?? "transparent",
          "--station-color": station.stripe,
        } as CSSProperties}
        title={`${station.name} · ${station.detail}`}
        type="button"
      >
        {landmark ? <LandmarkArt index={index} /> : <span className="street-crayon" />}
        <span className="board-stop-copy"><b>{station.name}</b><small>{station.detail}</small></span>
        {station.development && <span className={`board-development ${station.development.kind} level-${station.development.level}`}>
          <i /><b>{station.development.level}</b>
        </span>}
      </button>;
    })}

    <div aria-label={lang === "zh" ? "玩家位置" : "Player positions"} className="board-pawns">
      {players.map((player) => {
        const [x, y] = MOVE_POINTS[player.pos] ?? MOVE_POINTS[0];
        const angle = ((player.number - 1) / Math.max(players.length, 1)) * Math.PI * 2;
        return <span
          aria-label={`${player.name}${player.active ? (lang === "zh" ? "，当前回合" : ", current turn") : ""}`}
          className={`board-pawn ${player.active ? "active" : ""}`}
          key={player.number}
          style={{
            left: `${x}%`, top: `${y}%`, background: player.color,
            "--pawn-x": `${Math.cos(angle) * 11}px`, "--pawn-y": `${Math.sin(angle) * 11}px`,
          } as CSSProperties}
          title={player.name}
        >{player.number}</span>;
      })}
    </div>

    {children}
  </div>;
}
