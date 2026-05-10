import type { CapturePayload, CaptureResult } from "../shared/messages";

const TOKEN_KEY = "apiToken";
const API_BASE = "http://localhost:8000";

type BackendSuccess = { id: number; translation: string };
type BackendDuplicate = { duplicate: true; existingWord: { id: number; status: string } };

export async function captureWord(payload: CapturePayload): Promise<CaptureResult> {
  let token: string;
  try {
    const stored = await chrome.storage.sync.get(TOKEN_KEY);
    token = (stored[TOKEN_KEY] as string) ?? "";
  } catch {
    return { status: "error", message: "Failed to read API token" };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/words`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Network error" };
  }

  if (!response.ok) {
    return { status: "error", message: `HTTP ${response.status}` };
  }

  let body: BackendSuccess | BackendDuplicate;
  try {
    body = (await response.json()) as BackendSuccess | BackendDuplicate;
  } catch {
    return { status: "error", message: "Invalid response body" };
  }

  if ("duplicate" in body && body.duplicate) {
    return { status: "duplicate", existingWord: body.existingWord };
  }

  const success = body as BackendSuccess;
  return { status: "ok", translation: success.translation, wordId: success.id };
}
