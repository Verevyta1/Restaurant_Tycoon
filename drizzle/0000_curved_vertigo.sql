CREATE TABLE `room_players` (
	`id` text PRIMARY KEY NOT NULL,
	`room_code` text NOT NULL,
	`name` text NOT NULL,
	`token` text NOT NULL,
	`seat` integer NOT NULL,
	`is_host` integer DEFAULT false NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`room_code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `room_players_token_unique` ON `room_players` (`token`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'lobby' NOT NULL,
	`game_state` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
