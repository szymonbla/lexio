import { sql } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type * as schema from "./schema.js";
import { wordContexts, words } from "./schema.js";
import type { NewWord, NewWordContext, Word, WordContext } from "./schema.js";

type DB = BunSQLiteDatabase<typeof schema>;

export class WordRepository {
  constructor(private db: DB) {}

  async insertWord(data: Omit<NewWord, "id" | "createdAt">): Promise<Word> {
    const rows = await this.db.insert(words).values(data).returning();
    return rows[0];
  }

  async insertWordContext(data: Omit<NewWordContext, "id" | "capturedAt">): Promise<WordContext> {
    const rows = await this.db.insert(wordContexts).values(data).returning();
    return rows[0];
  }

  async findByWord(word: string): Promise<Word | undefined> {
    const rows = await this.db
      .select()
      .from(words)
      .where(sql`lower(${words.word}) = lower(${word})`);
    return rows[0];
  }
}
