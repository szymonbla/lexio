import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const words = sqliteTable("word", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  word: text("word").notNull().unique(),
  status: text("status").notNull().default("new"),
  translation: text("translation"),
});

export const wordContexts = sqliteTable("word_context", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  wordId: text("word_id")
    .notNull()
    .references(() => words.id),
  sentence: text("sentence").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceTitle: text("source_title").notNull(),
  capturedAt: text("captured_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Word = typeof words.$inferSelect;
export type NewWord = typeof words.$inferInsert;
export type WordContext = typeof wordContexts.$inferSelect;
export type NewWordContext = typeof wordContexts.$inferInsert;
