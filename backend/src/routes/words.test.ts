import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as schema from "../db/schema.js";
import { WordRepository } from "../db/word-repository.js";
import { createWordsRouter } from "./words.js";

let translateMock: (word: string, sentence: string) => Promise<string>;

function createTestSetup() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./drizzle" });
  const repo = new WordRepository(db);
  const app = createWordsRouter({
    repo,
    translate: (w, s) => translateMock(w, s),
  });
  return { app, repo, sqlite };
}

const validBody = {
  word: "acquire",
  sentence: "He managed to acquire the painting.",
  sourceUrl: "https://example.com/article",
  sourceTitle: "Example Article",
  capturedAt: "2026-05-11T10:00:00Z",
};

describe("POST /words", () => {
  let app: ReturnType<typeof createWordsRouter>;
  let repo: WordRepository;
  let cleanup: () => void;

  beforeEach(() => {
    translateMock = async () => "nabyć";
    const setup = createTestSetup();
    app = setup.app;
    repo = setup.repo;
    cleanup = () => setup.sqlite.close();
  });

  afterEach(() => cleanup());

  it("returns 400 with invalid body", async () => {
    const res = await app.request("/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: "" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(typeof json.error).toBe("string");
    expect(json.error.length).toBeGreaterThan(0);
  });

  it("saves Word and WordContext, returns 201 with id and translation", async () => {
    const res = await app.request("/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(201);
    const json = await res.json() as { id: string; translation: string };
    expect(typeof json.id).toBe("string");
    expect(json.translation).toBe("nabyć");

    const found = await repo.findByWord("acquire");
    expect(found).toBeDefined();
    expect(found!.word).toBe("acquire");
  });

  it("returns 502 when DeepL fails, Word and WordContext already saved", async () => {
    translateMock = async () => { throw new Error("DeepL down"); };

    const res = await app.request("/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json).toEqual({ error: "Translation unavailable" });

    const found = await repo.findByWord("acquire");
    expect(found).toBeDefined();
  });

  it("returns 200 with existing translation for duplicate word, skips DeepL", async () => {
    await app.request("/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    let translateCallCount = 0;
    translateMock = async () => { translateCallCount++; return "nabyć"; };

    const res = await app.request("/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validBody, sentence: "She acquired a new skill." }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { id: string; translation: string };
    expect(json.translation).toBe("nabyć");
    expect(translateCallCount).toBe(0);
  });
});
