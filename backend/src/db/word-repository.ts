import { eq, sql } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type * as schema from "./schema.js";
import { wordContexts, words } from "./schema.js";
import type { Word } from "./schema.js";

type DB = BunSQLiteDatabase<typeof schema>;

type CaptureWordInput = {
  word: string;
  sentence: string;
  sourceUrl: string;
  sourceTitle: string;
  capturedAt: string;
};

export class WordRepository {
  constructor(private db: DB) {}

  async captureWord(data: CaptureWordInput): Promise<{ word: Word; isNew: boolean }> {
    const existing = await this.findByWord(data.word);

    const contextData = {
      sentence: data.sentence,
      sourceUrl: data.sourceUrl,
      sourceTitle: data.sourceTitle,
      capturedAt: data.capturedAt,
    };

    if (existing) {
      await this.db.insert(wordContexts).values({ wordId: existing.id, ...contextData });
      return { word: existing, isNew: false };
    }

    const [inserted] = await this.db.insert(words).values({ word: data.word }).returning();
    await this.db.insert(wordContexts).values({ wordId: inserted.id, ...contextData });
    return { word: inserted, isNew: true };
  }

  async updateTranslation(id: string, translation: string): Promise<void> {
    await this.db.update(words).set({ translation }).where(eq(words.id, id));
  }

  async findByWord(word: string): Promise<Word | undefined> {
    const rows = await this.db
      .select()
      .from(words)
      .where(sql`lower(${words.word}) = lower(${word})`);
    return rows[0];
  }

  async countContextsByWordId(wordId: string): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(wordContexts)
      .where(eq(wordContexts.wordId, wordId));
    return rows[0].count;
  }
}
