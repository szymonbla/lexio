import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as schema from "./schema.js";
import { WordRepository } from "./word-repository.js";

function createTestDB() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./drizzle" });
  return { db, sqlite };
}

describe("WordRepository", () => {
  let repo: WordRepository;
  let cleanup: () => void;

  beforeEach(() => {
    const { db, sqlite } = createTestDB();
    repo = new WordRepository(db);
    cleanup = () => sqlite.close();
  });

  afterEach(() => cleanup());

  it("insertWord returns record with id and createdAt", async () => {
    const word = await repo.insertWord({ word: "acquire" });
    expect(word.id).toBeDefined();
    expect(word.createdAt).toBeDefined();
    expect(word.word).toBe("acquire");
    expect(word.status).toBe("new");
  });

  it("findByWord is case-insensitive", async () => {
    await repo.insertWord({ word: "acquire" });
    const found = await repo.findByWord("Acquire");
    expect(found).toBeDefined();
    expect(found!.word).toBe("acquire");
  });

  it("findByWord returns undefined when not found", async () => {
    expect(await repo.findByWord("missing")).toBeUndefined();
  });

  it("insertWordContext links to word via word_id", async () => {
    const word = await repo.insertWord({ word: "ephemeral" });
    const ctx = await repo.insertWordContext({
      wordId: word.id,
      sentence: "That was ephemeral.",
      sourceUrl: "https://example.com",
      sourceTitle: "Example",
    });
    expect(ctx.id).toBeDefined();
    expect(ctx.wordId).toBe(word.id);
  });

  it("word column has UNIQUE constraint", async () => {
    await repo.insertWord({ word: "unique" });
    expect(async () => await repo.insertWord({ word: "unique" })).toThrow();
  });
});
