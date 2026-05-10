# 04 — Message bus + background API client

- **Type**: AFK
- **Blocked by**: 01
- **Stories**: 17, 19, 20

## What to build

Typed Chrome message passing between content script and background service worker, plus the background API client that calls `POST /words`.

Message shapes (from PRD — encodes the contract):

```ts
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

Background SW reads the API token from `chrome.storage.sync`, calls `POST /words`, and responds with `CAPTURE_RESULT`. The token is never forwarded to the content script.

## Acceptance criteria

- [ ] All `chrome.runtime.sendMessage` calls are typed — no raw untyped calls anywhere
- [ ] Background SW reads token from `chrome.storage.sync` (never exposed to content script)
- [ ] On 2xx response: responds `{ status: 'ok', translation, wordId }`
- [ ] On duplicate response from backend: responds `{ status: 'duplicate', existingWord }`
- [ ] On network error or non-2xx: responds `{ status: 'error', message }`
- [ ] Integration tests with mock fetch cover all three response paths
- [ ] `sourceUrl`, `sourceTitle`, and `capturedAt` (ISO 8601) are included in every request body
