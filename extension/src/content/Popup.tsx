import { useEffect } from "react";
import type { CaptureResult } from "../shared/messages";

export type PopupState =
  | { phase: "IDLE" }
  | { phase: "SAVING" }
  | { phase: "DONE"; translation: string }
  | { phase: "ERROR"; message: string }
  | { phase: "DUPLICATE"; existingWord: { id: number; status: string } };

type Props = {
  state: PopupState;
  onClose: () => void;
};

const STYLES = `
  :host { all: initial; font-family: sans-serif; }
  .popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.18);
    padding: 24px 28px;
    min-width: 220px;
    max-width: 340px;
    z-index: 2147483647;
    color: #111;
    font-size: 15px;
    line-height: 1.5;
  }
  .label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 6px;
  }
  .translation { font-size: 22px; font-weight: 700; margin-bottom: 16px; }
  .status { margin-bottom: 16px; }
  .error { color: #c0392b; margin-bottom: 4px; }
  .close {
    display: block;
    width: 100%;
    padding: 8px 0;
    background: #1a1a1a;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    margin-top: 4px;
  }
  .spinner {
    display: inline-block;
    width: 18px; height: 18px;
    border: 2px solid #ddd;
    border-top-color: #1a1a1a;
    border-radius: 50%;
    animation: spin .7s linear infinite;
    vertical-align: middle;
    margin-right: 8px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export function Popup({ state, onClose }: Props) {
  useEffect(() => {
    if (state.phase === "ERROR") {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
    if (state.phase === "DONE") {
      const t = setTimeout(onClose, 2500);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  if (state.phase === "IDLE") return null;

  return (
    <>
      <style>{STYLES}</style>
      <div className="popup">
        {state.phase === "SAVING" && (
          <span><span className="spinner" />Saving…</span>
        )}
        {state.phase === "DONE" && (
          <>
            <div className="label">Translation</div>
            <div className="translation">{state.translation}</div>
            <button className="close" onClick={onClose}>Close</button>
          </>
        )}
        {state.phase === "DUPLICATE" && (
          <>
            <div className="status">
              Already in your collection
              {state.existingWord.status && (
                <> — <strong>{state.existingWord.status}</strong></>
              )}
            </div>
            <button className="close" onClick={onClose}>Close</button>
          </>
        )}
        {state.phase === "ERROR" && (
          <div className="error">{state.message}</div>
        )}
      </div>
    </>
  );
}

export function popupStateFromResult(result: CaptureResult): PopupState {
  if (result.status === "ok") return { phase: "DONE", translation: result.translation };
  if (result.status === "duplicate") return { phase: "DUPLICATE", existingWord: result.existingWord };
  return { phase: "ERROR", message: result.message };
}
