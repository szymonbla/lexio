PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_word_context` (
	`id` text PRIMARY KEY NOT NULL,
	`word_id` text NOT NULL,
	`sentence` text NOT NULL,
	`source_url` text NOT NULL,
	`source_title` text NOT NULL,
	`captured_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`word_id`) REFERENCES `word`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_word_context`("id", "word_id", "sentence", "source_url", "source_title", "captured_at") SELECT "id", "word_id", "sentence", "source_url", "source_title", "captured_at" FROM `word_context`;--> statement-breakpoint
DROP TABLE `word_context`;--> statement-breakpoint
ALTER TABLE `__new_word_context` RENAME TO `word_context`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_word` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`word` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`translation` text
);
--> statement-breakpoint
INSERT INTO `__new_word`("id", "created_at", "word", "status", "translation") SELECT "id", "created_at", "word", "status", "translation" FROM `word`;--> statement-breakpoint
DROP TABLE `word`;--> statement-breakpoint
ALTER TABLE `__new_word` RENAME TO `word`;--> statement-breakpoint
CREATE UNIQUE INDEX `word_word_unique` ON `word` (`word`);