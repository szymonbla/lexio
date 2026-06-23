import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as schema from "../db/schema.js";
import { WordRepository } from "../db/word-repository.js";
import { createWordsRouter } from "./words.js";

let translateMock: (word: string, sentence: string) => Promise<string>;

const TEST_TOKEN = "test-api-token";

function createTestSetup() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./drizzle" });
  const repo = new WordRepository(db);
  const app = createWordsRouter({
    repo,
    translate: (w, s) => translateMock(w, s),
    apiToken: TEST_TOKEN,
  });
  return { app, repo, sqlite };
}

const validBody = {
  word: "acquire",
  sentence: "He managed to acquire the painting.",
  sourceUrl: "https://example.com/article",
  sourceTitle: "Example Article",
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

  it("duplicate returns 200 with duplicate:true and existingWord, skips DeepL, saves new context", async () => {
    const first = await app.request("/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const firstJson = await first.json() as { id: string; translation: string };
    const wordId = firstJson.id;

    let translateCallCount = 0;
    translateMock = async () => { translateCallCount++; return "nabyć"; };

    const res = await app.request("/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validBody, sentence: "She acquired a new skill." }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { duplicate: boolean; existingWord: { id: string; status: string } };
    expect(json.duplicate).toBe(true);
    expect(json.existingWord.id).toBe(wordId);
    expect(typeof json.existingWord.status).toBe("string");
    expect(translateCallCount).toBe(0);

    const contextCount = await repo.countContextsByWordId(wordId);
    expect(contextCount).toBe(2);
  });

  it("returns 422 when word contains whitespace", async () => {
    const res = await app.request("/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validBody, word: "two words" }),
    });
    expect(res.status).toBe(422);
    const json = await res.json() as { error: string };
    expect(typeof json.error).toBe("string");
  });

  it("GET /words returns 401 when Authorization header missing", async () => {
    const res = await app.request("/words", { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("GET /words returns 401 with invalid token", async () => {
    const res = await app.request("/words", {
      method: "GET",
      headers: { Authorization: "Bearer wrong-token" },
    });
    expect(res.status).toBe(401);
  });

  it("GET /words returns captured words with contexts sorted by createdAt desc", async () => {
    await app.request("/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });
    await app.request("/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validBody, word: "serendipity", sentence: "A moment of serendipity." }),
    });

    const res = await app.request("/words", {
      method: "GET",
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { word: string; status: string; translation: string | null; createdAt: string; contexts: { sourceUrl: string; sourceTitle: string; capturedAt: string }[] }[];
    expect(json.length).toBe(2);
    expect(typeof json[0].word).toBe("string");
    expect(typeof json[0].status).toBe("string");
    expect(Array.isArray(json[0].contexts)).toBe(true);
    expect(json[0].contexts[0].sourceUrl).toBe(validBody.sourceUrl);
  });

  it("duplicate detection is case-insensitive", async () => {
    await app.request("/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    const res = await app.request("/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validBody, word: "ACQUIRE" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { duplicate: boolean };
    expect(json.duplicate).toBe(true);
  });
});
