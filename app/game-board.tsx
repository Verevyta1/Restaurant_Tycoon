import type { CSSProperties, ReactNode } from "react";
import { MOVE_POINTS } from "./game-map-data";

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

const PAWN_OFFSETS = [
  ["-11px", "-9px"],
  ["11px", "-9px"],
  ["-11px", "9px"],
  ["11px", "9px"],
] as const;

const upgradeSprite = (level: number) => {
  if (level <= 1) return "/property-upgrade-1.png";
  if (level >= 5) return "/property-upgrade-3.png";
  return "/property-upgrade-2.png";
};

const ROUTE_PATH = "M120 350 C112 282 160 200 220 170 C300 145 390 170 480 130 C580 85 700 70 790 115 C860 150 880 230 825 300 C780 350 725 400 760 440 C820 460 870 515 860 575 C845 635 755 660 680 630 C600 610 550 560 600 505 C640 468 620 420 560 385 C480 340 430 375 350 420 C270 460 190 435 135 395 C112 380 105 365 120 350Z";

const pointStyle = (cell: number): CSSProperties => {
  const point = MOVE_POINTS[cell] ?? MOVE_POINTS[0];
  return {
    left: `${point.x}%`,
    top: `${point.y}%`,
    "--label-x": `${point.label[0]}px`,
    "--label-y": `${point.label[1]}px`,
    "--station-tilt": `${point.tilt}deg`,
    "--label-tilt": `${point.tilt * -.35}deg`,
    "--art-tilt": `${point.tilt * -.65}deg`,
  } as CSSProperties;
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

      <svg aria-hidden="true" className="board-route-art" preserveAspectRatio="none" viewBox="0 0 1000 700">
        <defs>
          <filter id="crayon-wobble" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence baseFrequency="0.018" numOctaves="2" seed="7" type="fractalNoise" />
            <feDisplacementMap in="SourceGraphic" scale="5" />
          </filter>
        </defs>
        <g className="board-crayon-patches">
          <path d="M35 112 C130 32 245 72 285 158 C227 224 98 228 35 112Z" />
          <path d="M532 35 C655 -8 817 24 858 128 C774 177 621 158 532 35Z" />
          <path d="M694 430 C810 386 987 454 984 608 C884 691 735 664 694 430Z" />
          <path d="M165 430 C282 382 466 417 534 541 C417 625 232 590 165 430Z" />
        </g>
        <path className="board-route-outline" d={ROUTE_PATH} />
        <path className="board-route-road" d={ROUTE_PATH} />
        <path className="board-route-pencil" d={ROUTE_PATH} />
      </svg>

      {stations.map((station) => <div
        className={`board-station ${station.ownerColor ? "has-owner" : ""}`}
        key={`${station.cell}-${station.name}`}
        style={{
          ...pointStyle(station.cell),
          "--owner-color": station.ownerColor ?? "transparent",
          "--station-color": station.stripe,
        } as CSSProperties}
      >
        <button
          aria-label={`${station.name} · ${station.detail}`}
          className={`board-stop ${station.type} ${station.ownerColor ? "owned" : ""}`}
          title={`${station.name} · ${station.detail}`}
          type="button"
        >
          {station.type === "start" && <span className="start-marker">START</span>}
          {station.development && <span className={`board-development ${station.development.kind}`}>
            <span
              aria-hidden="true"
              className="upgrade-art"
              style={{ backgroundImage: `url(${upgradeSprite(station.development.level)})` }}
            />
            <b>{station.development.level}</b>
          </span>}
        </button>
        <span aria-hidden="true" className="board-stop-copy">
          <b>{station.name}</b>
        </span>
      </div>)}

      <div aria-label={lang === "zh" ? "玩家位置" : "Player positions"} className="board-pawns">
        {players.map((player) => {
          const [x, y] = PAWN_OFFSETS[(player.number - 1) % PAWN_OFFSETS.length];
          return <span
            aria-label={`${player.name}${player.active ? (lang === "zh" ? "，当前回合" : ", current turn") : ""}`}
            className={`board-pawn ${player.active ? "active" : ""}`}
            key={player.number}
            style={{
              ...pointStyle(player.pos),
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
