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
  assert.match(html, /56/);
});

test("board keeps route, landmarks, streets, buildings, and pawns separate", async () => {
  const [board, mapData, styles] = await Promise.all([
    readFile(new URL("../app/game-board.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/game-map-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/game-board.css", import.meta.url), "utf8"),
  ]);
  assert.match(mapData, /length:\s*56/);
  assert.match(mapData, /LANDMARK_STATION_CELLS/);
  assert.match(board, /board-route/);
  assert.match(board, /landmark-stop/);
  assert.match(board, /street-stop/);
  assert.match(board, /board-development/);
  assert.match(board, /board-pawn/);
  assert.match(styles, /london-pencil-landmarks\.png/);
  assert.match(styles, /london-pencil-house-levels\.png/);
  assert.match(styles, /london-pencil-hotel-levels\.png/);
  assert.match(styles, /london-pencil-shop-levels\.png/);
});
