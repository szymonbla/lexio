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

const baseCapture = {
  sentence: "He managed to acquire the painting.",
  sourceUrl: "https://example.com",
  sourceTitle: "Example",
};

describe("WordRepository", () => {
  let repo: WordRepository;
  let cleanup: () => void;

  beforeEach(() => {
    const { db, sqlite } = createTestDB();
    repo = new WordRepository(db);
    cleanup = () => sqlite.close();
  });

  afterEach(() => cleanup());

  it("captureWord returns word with id and isNew: true for new word", async () => {
    const { word, isNew } = await repo.captureWord({ word: "acquire", ...baseCapture });
    expect(word.id).toBeDefined();
    expect(word.word).toBe("acquire");
    expect(word.status).toBe("new");
    expect(isNew).toBe(true);
  });

  it("captureWord for duplicate returns isNew: false with same word id", async () => {
    const { word: first } = await repo.captureWord({ word: "acquire", ...baseCapture });
    const { word: second, isNew } = await repo.captureWord({
      word: "acquire",
      ...baseCapture,
      sentence: "Another sentence with acquire.",
    });
    expect(isNew).toBe(false);
    expect(second.id).toBe(first.id);
  });

  it("captureWord is case-insensitive for duplicate detection", async () => {
    await repo.captureWord({ word: "acquire", ...baseCapture });
    const { isNew } = await repo.captureWord({ word: "Acquire", ...baseCapture });
    expect(isNew).toBe(false);
  });

  it("findByWord is case-insensitive", async () => {
    await repo.captureWord({ word: "acquire", ...baseCapture });
    const found = await repo.findByWord("Acquire");
    expect(found).toBeDefined();
    expect(found!.word).toBe("acquire");
  });

  it("findByWord returns undefined when not found", async () => {
    expect(await repo.findByWord("missing")).toBeUndefined();
  });
});
