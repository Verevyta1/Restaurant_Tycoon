import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  code: text("code").primaryKey(),
  status: text("status").notNull().default("lobby"),
  gameState: text("game_state"),
  settings: text("settings"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const roomPlayers = sqliteTable("room_players", {
  id: text("id").primaryKey(),
  roomCode: text("room_code").notNull().references(() => rooms.code, { onDelete: "cascade" }),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  seat: integer("seat").notNull(),
  isHost: integer("is_host", { mode: "boolean" }).notNull().default(false),
  lastSeenAt: integer("last_seen_at").notNull(),
}, (table) => [index("idx_room_players_room_code").on(table.roomCode)]);
