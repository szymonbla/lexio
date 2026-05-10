export type CapturePayload = {
  word: string;
  sentence: string;
  sourceUrl: string;
  sourceTitle: string;
  capturedAt: string;
};

export type CaptureResult =
  | { status: "ok"; translation: string; wordId: number }
  | { status: "duplicate"; existingWord: { id: number; status: string } }
  | { status: "error"; message: string };

export type ExtensionMessage =
  | { type: "CAPTURE_WORD"; payload: CapturePayload }
  | { type: "CAPTURE_RESULT"; payload: CaptureResult };

export function sendCapture(payload: CapturePayload): Promise<CaptureResult> {
  const msg: ExtensionMessage = { type: "CAPTURE_WORD", payload };
  return chrome.runtime.sendMessage(msg) as Promise<CaptureResult>;
}
