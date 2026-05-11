# PRD — Backend Phase 1: Word Capture + Translation

## Problem Statement

When the user selects an unknown word in the Chrome extension, there is no backend to persist the word with its context or provide an immediate Polish translation. The extension cannot complete its core loop: capture → save → confirm.

## Solution

A lightweight Node.js/Hono backend service that accepts a word capture from the extension, saves the word and its sentence context to SQLite, fetches a Polish translation from the DeepL API synchronously, and returns the result. Duplicate words are detected and reported instead of re-inserted.

## User Stories

1. As an extension user, I want the captured word to be saved to the backend when I click the capture button, so that I don't lose words I encounter while reading.
2. As an extension user, I want to receive a Polish translation of the word immediately after capturing it, so I can understand its meaning without leaving the article.
3. As an extension user, I want the translation to be a short Polish phrase (not a dictionary entry), so the popup is readable at a glance.
4. As an extension user, I want the backend to include the sentence context when fetching the translation, so the translation matches the word's actual usage in the article.
5. As an extension user, I want to be notified when I capture a word already in my collection, so I know it's a duplicate and can see its current learning status.
6. As an extension user, I want the source URL, source title, and capture timestamp saved alongside the word, so I can trace where I first encountered it.
7. As a system, I want all API requests to require a valid Bearer token, so the backend is not publicly accessible.
8. As a system, I want the API to reject unauthorized requests with HTTP 401, so misconfigured or unknown clients are refused clearly.
9. As a system, I want DeepL API failures to surface as an error response rather than silently saving without a translation, so the extension can inform the user.

## Implementation Decisions

### Modules

**Auth Middleware** — Hono middleware that reads the `Authorization: Bearer <token>` header and compares it to a token stored in an environment variable. Returns 401 if missing or mismatched. Pure function with no DB dependency — easy to unit test.

**DeepL Client** — Thin wrapper around the DeepL REST API (`/v2/translate`). Accepts `{ word, sentence }`, sends the word as the text to translate and the sentence as surrounding context (DeepL supports `context` parameter). Returns a short Polish phrase string. Isolated from DB and routing — testable with HTTP mocking.

**Word Repository** — All SQLite read/write operations: insert Word, insert WordContext, find Word by normalized text. The duplicate check is a case-insensitive lookup on the `word` column before insert. No business logic — only data access.

**Word Handler** — Orchestrates the request: validate input (Zod) → check duplicate via repository → insert Word + WordContext → call DeepL Client → return response. Depends on repository and DeepL client via constructor injection for testability.

**DB Schema (Drizzle)** — Two tables:

```
Word: id, created_at, word (TEXT UNIQUE), status (TEXT, default 'new'), translation (TEXT)
WordContext: id, word_id (FK), sentence, source_url, source_title, captured_at
```

### API Contract

**Request:** `POST /words`
```
Authorization: Bearer <token>
Content-Type: application/json

{
  "word": string,          // selected text, max 5 words
  "sentence": string,      // full sentence containing the word
  "sourceUrl": string,
  "sourceTitle": string,
  "capturedAt": string     // ISO 8601
}
```

**Response — new word (201):**
```
{ "id": number, "translation": string }
```

**Response — duplicate (200):**
```
{ "duplicate": true, "existingWord": { "id": number, "status": string } }
```

**Response — auth failure (401):**
```
{ "error": "Unauthorized" }
```

**Response — DeepL failure (502):**
```
{ "error": "Translation unavailable" }
```

### Duplicate Detection

Case-insensitive match on the `word` column. When a duplicate is found, a new `WordContext` row is still inserted (preserving the new sentence context) and the duplicate response is returned. The Word row is not re-inserted or updated.

### Synchronous Translation

DeepL is called within the `POST /words` request handler. The HTTP response is not sent until DeepL responds. This matches the extension's current flow (it awaits the response before updating popup state). Async translation is deferred to Layer 1.

### Environment Variables

- `API_TOKEN` — static Bearer token for auth
- `DEEPL_API_KEY` — DeepL authentication key
- `DATABASE_PATH` — path to the SQLite file (default `./lexio.db`)
- `PORT` — server port (default `8000`)

## Testing Decisions

A good test exercises the module's public contract through its interface, not its internals. Tests should not assert on SQL queries or HTTP request shapes — only on inputs and outputs as seen by callers.

**Auth Middleware** — unit tests: valid token passes, missing header returns 401, wrong token returns 401.

**DeepL Client** — unit tests with a mock HTTP server: successful translation returns string, non-200 from DeepL throws, network error throws.

**Word Repository** — unit tests with an in-memory SQLite instance (`:memory:` via better-sqlite3): insert + find returns the row, duplicate lookup is case-insensitive, WordContext is correctly linked by word_id.

**Word Handler (integration)** — tests that spin up the full Hono app against a real in-memory DB and a mocked DeepL client: happy path returns `{ id, translation }`, duplicate returns `{ duplicate: true, existingWord }`, DeepL failure returns 502, missing auth returns 401.

## Out of Scope

- Exercise generation (fill-in-blank, write-sentence) — Layer 1
- AI-based translation or evaluation (LLM) — Layer 1
- Spaced repetition / review scheduling — Layer 1
- Langfuse / OpenTelemetry tracing — Layer 1
- `GET /words`, `GET /words/:id`, `GET /review/due` endpoints — Layer 1+
- PWA mobile client — Layer 2
- Multi-user support, registration, login — Layer 3
- Async exercise polling — Layer 1

## Progress

- [x] #2 Backend scaffolding — Hono + OpenAPI + env validation + health endpoint
- [x] #3 DB schema + Word Repository — Drizzle/bun:sqlite, Word+WordContext tables, migrations, unit tests
- [x] #4 POST /words happy path — auth middleware, DeepL client, handler, E2E tests

## Further Notes

- Stack: Node.js + TypeScript, Hono + `@hono/node-server`, Drizzle ORM, better-sqlite3, Zod, Biome
- Deployment target: Railway (SQLite file on persistent volume)
- DeepL free tier supports 500k characters/month — sufficient for personal use
- The `word` column has a UNIQUE constraint; the duplicate check relies on this as a safety net but the application-level lookup runs first to return a proper duplicate response rather than a DB error
