# PRD: Lexio Browser Extension (Layer 0 MVP)

## Problem Statement

When reading English technical articles, the user encounters unfamiliar words but has no low-friction way to capture them with their reading context. Existing tools (Anki, Notion, dictionary apps) interrupt the reading flow and discard the sentence context that makes a word memorable. The result: words are either ignored or looked up and immediately forgotten.

## Solution

A Chrome extension that lets the user capture a word in one click without leaving the page. A floating button appears above any text selection; clicking it saves the word, its sentence context, and page metadata to the backend, then displays a popup with the Polish translation. The word is permanently stored for future review. The user never leaves the page.

## User Stories

1. As a reader, I want a capture button to appear above my text selection, so that I can save a word without interrupting my reading flow.
2. As a reader, I want the capture button to appear above (not below) my selection, so that it doesn't obscure the text I'm about to read.
3. As a reader, I want the capture button to disappear when I click elsewhere or start a new selection, so that it doesn't clutter the page.
4. As a reader, I want to see the selected word highlighted until the popup closes, so that I know which word I'm working on.
5. As a reader, I want the popup to appear in a shadow DOM, so that it looks consistent regardless of the page's own CSS.
6. As a reader, I want to see a loading state while the word is being saved and translated, so that I know the system is working.
7. As a reader, I want to see the Polish translation of the captured word, so that I can immediately verify I captured the right word.
8. As a reader, I want to close the popup manually, so that I can return to reading on my own terms.
9. As a reader, I want the popup to auto-close after I've seen the translation, so that it doesn't require interaction to dismiss.
10. As a reader, I want to capture multi-word phrases (up to 5 words), so that expressions like "machine learning" are saved as a unit.
11. As a reader, I want the extension to silently ignore selections longer than 5 words, so that accidental long selections don't trigger the capture flow.
12. As a reader, I want to be notified when a word I'm capturing is already in my collection, so that I don't duplicate effort.
13. As a reader, I want the existing collection entry shown when a duplicate is detected, so that I can recall my previous encounter with the word.
14. As a reader, I want an error message when the backend is unreachable, so that I know the word was not saved.
15. As a reader, I want the error message to disappear after 3 seconds, so that it doesn't linger on the page.
16. As a reader, I want my API token to be configured once at installation, so that I never have to enter it again during normal use.
17. As a reader, I want my API token to never be visible in the page context, so that it cannot be extracted by malicious page scripts.
18. As a system, I want the sentence containing the selection extracted from the DOM, so that the backend receives full linguistic context for translation.
19. As a system, I want the source URL, page title, and capture timestamp saved with every word, so that the user can later recall where they encountered it.
20. As a system, I want all backend requests proxied through the background service worker, so that the API token is held only in the extension's secure context.

## Implementation Decisions

### Modules

**Selection Detector**
Listens for `mouseup` events on the page. When the selection is non-empty and between 1–5 words, emits a selection event with: selected text, bounding rect of the selection (for button placement), and a reference to the DOM range (for sentence extraction).

**Sentence Extractor**
Given a DOM Range, walks the text nodes of the containing block element to reconstruct the full sentence. Returns the sentence as a plain string. This is a pure function — no DOM mutation, no side effects — making it easy to unit test.

**Capture Button**
A minimal React component rendered into a `position: fixed` container (not shadow DOM — it needs to be positioned relative to the viewport). Appears above the selection bounding rect. Disappears on `mousedown` outside itself or when a new selection starts.

**Popup (Shadow DOM)**
A React component tree mounted inside a shadow root attached to a `div` injected into `<body>`. Completely isolated from page CSS. Manages the capture state machine:

```
IDLE → SAVING → DONE | ERROR | DUPLICATE
```

- **IDLE**: not rendered
- **SAVING**: spinner + "Saving..." — POST /words in flight
- **DONE**: Polish translation displayed, close button
- **ERROR**: error message, auto-dismisses after 3s
- **DUPLICATE**: informs user the word exists, shows its current status

State transitions are driven by messages received from the background service worker.

**Message Bus**
Typed Chrome message passing (content script ↔ background SW). All message shapes defined as a discriminated union — no untyped `chrome.runtime.sendMessage` calls anywhere in the codebase.

```
// shape (from prototype — encodes the contract):
type ExtensionMessage =
  | { type: 'CAPTURE_WORD'; payload: CapturePayload }
  | { type: 'CAPTURE_RESULT'; payload: CaptureResult }

type CapturePayload = {
  word: string;
  sentence: string;
  sourceUrl: string;
  sourceTitle: string;
  capturedAt: string; // ISO 8601
};

type CaptureResult =
  | { status: 'ok'; translation: string; wordId: number }
  | { status: 'duplicate'; existingWord: { id: number; status: string } }
  | { status: 'error'; message: string };
```

**Background API Client**
Service worker. Receives `CAPTURE_WORD` messages, reads API token from `chrome.storage.sync`, calls `POST /words` on the backend, responds with `CAPTURE_RESULT`. Never exposes the token to any content script.

**Token Storage**
Thin wrapper around `chrome.storage.sync` for reading/writing the API token. Used only by the Background API Client and a minimal options page for initial setup.

### Build

- Vite + `@vitejs/plugin-react` + `vite-plugin-web-extension`
- MV3 manifest — no `eval`, no inline scripts, CSP-compliant
- Separate entry points: `content/index.ts`, `background/index.ts`, `options/index.html`
- Output: `dist/` directory loaded as an unpacked extension during development

### API Contract (extension → backend)

`POST /words` — synchronous. Backend saves the word + metadata, calls DeepL, returns the translation in one response. Extension does not poll.

Request body:
```json
{
  "word": "...",
  "sentence": "...",
  "sourceUrl": "...",
  "sourceTitle": "...",
  "capturedAt": "2026-05-07T10:00:00Z"
}
```

Response (success):
```json
{ "id": 42, "translation": "..." }
```

Response (duplicate):
```json
{ "duplicate": true, "existingWord": { "id": 7, "status": "learning" } }
```

## Testing Decisions

Good tests verify observable behavior from the outside — what the module returns or what side effects it produces — not which internal functions were called.

**Sentence Extractor** — unit tested. Pure function: given a DOM fragment + a range, assert the returned sentence string. No mocks needed. This is the module most worth testing because its edge cases (selection at sentence boundary, multiple sentences in a block, inline elements mid-sentence) are subtle.

**Message Bus types** — TypeScript compilation is the test. No runtime test needed for shape validation.

**Background API Client** — integration tested with a mock fetch. Assert that the correct HTTP request is made and that `CAPTURE_RESULT` messages match the expected shape for success / duplicate / error responses.

No prior test art exists in the codebase (project is new).

## Out of Scope

- Exercise generation and answer submission (Layer 1)
- Spaced repetition scheduling
- PWA / mobile review sessions
- Highlighting previously saved words on pages (Layer 2)
- Firefox, Safari support
- YouTube / video captions
- Offline capture / local storage fallback
- Multi-user / authentication beyond static API token
- Options UI beyond API token input

## Further Notes

- The extension is for a single user — no multi-tenancy concerns in the extension itself.
- The backend must be deployed and reachable before the extension is useful; local development will use a `localhost` backend URL configurable via the options page or hardcoded in dev builds.
- DeepL translation is handled entirely server-side; the extension has no dependency on DeepL directly.
