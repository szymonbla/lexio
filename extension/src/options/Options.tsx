import { useEffect, useRef, useState } from "react";

const TOKEN_KEY = "apiToken";

export function Options() {
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    chrome.storage.sync.get(TOKEN_KEY, (result) => {
      if (result[TOKEN_KEY]) setToken(result[TOKEN_KEY] as string);
    });
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    chrome.storage.sync.set({ [TOKEN_KEY]: token }, () => {
      setSaved(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <form onSubmit={handleSave} style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 400 }}>
      <h2 style={{ marginTop: 0 }}>Lexio</h2>
      <label htmlFor="token" style={{ display: "block", marginBottom: 6 }}>
        API token
      </label>
      <input
        id="token"
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Paste your API token"
        style={{ width: "100%", padding: "6px 8px", fontSize: 14, boxSizing: "border-box" }}
      />
      <button type="submit" style={{ marginTop: 12, padding: "6px 16px" }}>
        Save
      </button>
      {saved && <span style={{ marginLeft: 12, color: "green" }}>Saved</span>}
    </form>
  );
}
