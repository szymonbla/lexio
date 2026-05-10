import { describe, it, expect, vi, beforeEach } from "vitest";
import { captureWord } from "./apiClient";
import type { CapturePayload } from "../shared/messages";

const payload: CapturePayload = {
  word: "ephemeral",
  sentence: "The ephemeral nature of clouds.",
  sourceUrl: "https://example.com/article",
  sourceTitle: "Cloud Science",
  capturedAt: "2026-05-07T12:00:00.000Z",
};

// Minimal chrome.storage.sync stub
vi.stubGlobal("chrome", {
  storage: {
    sync: {
      get: vi.fn().mockResolvedValue({ apiToken: "test-token" }),
    },
  },
});

beforeEach(() => {
  vi.restoreAllMocks();
  (chrome.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({ apiToken: "test-token" });
});

describe("captureWord", () => {
  it("returns ok result on 2xx success response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 42, translation: "efemeryczny" }),
      })
    );

    const result = await captureWord(payload);
    expect(result).toEqual({ status: "ok", translation: "efemeryczny", wordId: 42 });

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/words");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string) as CapturePayload;
    expect(body.word).toBe("ephemeral");
    expect(body.sourceUrl).toBe("https://example.com/article");
    expect(body.sourceTitle).toBe("Cloud Science");
    expect(body.capturedAt).toBe("2026-05-07T12:00:00.000Z");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-token");
  });

  it("returns duplicate result when backend signals duplicate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            duplicate: true,
            existingWord: { id: 7, status: "learning" },
          }),
      })
    );

    const result = await captureWord(payload);
    expect(result).toEqual({
      status: "duplicate",
      existingWord: { id: 7, status: "learning" },
    });
  });

  it("returns error result on non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })
    );

    const result = await captureWord(payload);
    expect(result).toEqual({ status: "error", message: "HTTP 401" });
  });

  it("returns error result on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Failed to fetch"))
    );

    const result = await captureWord(payload);
    expect(result).toEqual({ status: "error", message: "Failed to fetch" });
  });
});
