CREATE TABLE `word_context` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word_id` integer NOT NULL,
	`sentence` text NOT NULL,
	`source_url` text NOT NULL,
	`source_title` text NOT NULL,
	`captured_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`word_id`) REFERENCES `word`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `word` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`word` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`translation` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `word_word_unique` ON `word` (`word`);