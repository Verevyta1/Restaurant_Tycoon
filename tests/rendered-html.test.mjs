import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server renders the London Tycoon home screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /London Tycoon/i);
  assert.match(html, /Play online with friends|在线与朋友玩/);
  assert.match(html, /24/);
});

test("board keeps a short curved route, external labels, upgrades, controls, and pawns separate", async () => {
  const [board, mapData, styles] = await Promise.all([
    readFile(new URL("../app/game-board.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/game-map-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/game-board.css", import.meta.url), "utf8"),
  ]);
  assert.match(mapData, /ROUTE_CELL_COUNT = 24/);
  assert.match(mapData, /MapRoutePoint/);
  assert.match(mapData, /LANDMARK_STATION_CELLS/);
  assert.equal(mapData.match(/\{ x: \d+, y: \d+, label:/g)?.length, 24);
  assert.match(board, /board-empty-center/);
  assert.match(board, /board-route-art/);
  assert.match(board, /board-station/);
  assert.match(board, /board-development/);
  assert.match(board, /board-pawn/);
  assert.match(board, /property-upgrade-1\.png/);
  assert.match(board, /property-upgrade-2\.png/);
  assert.match(board, /property-upgrade-3\.png/);
  assert.match(styles, /aspect-ratio: 10 \/ 7/);
  assert.match(styles, /board-stop-copy/);
  assert.match(styles, /width: 78px/);
  assert.doesNotMatch(board, /board-title|pencil-map-title|LONDON TYCOON|伦敦大富翁/);
});
