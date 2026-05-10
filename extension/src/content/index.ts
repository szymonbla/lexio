import { createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CaptureButton } from "./CaptureButton";
import { Popup, popupStateFromResult, type PopupState } from "./Popup";
import { initSelectionDetector, type SelectionEvent } from "./selectionDetector";
import { extractSentence } from "./sentenceExtractor";
import { applyHighlight, removeHighlight } from "./highlight";
import { sendCapture } from "../shared/messages";

// --- Button container (positioned absolute overlay) ---
const buttonHost = document.createElement("div");
buttonHost.style.cssText = "position:absolute;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483647;";
document.documentElement.appendChild(buttonHost);
const buttonRoot = createRoot(buttonHost);

// --- Popup container (shadow DOM) ---
const popupHost = document.createElement("div");
document.body.appendChild(popupHost);
const shadowRoot = popupHost.attachShadow({ mode: "open" });
const shadowMount = document.createElement("div");
shadowRoot.appendChild(shadowMount);
const popupRoot: Root = createRoot(shadowMount);

// --- State ---
let currentSelection: SelectionEvent | null = null;
let popupState: PopupState = { phase: "IDLE" };

function renderAll() {
  buttonRoot.render(
    createElement(StrictMode, null,
      currentSelection && popupState.phase === "IDLE"
        ? createElement(CaptureButton, {
            rect: currentSelection.rect,
            text: currentSelection.text,
            onCapture: handleCapture,
            onDismiss: handleDismiss,
          })
        : null
    )
  );

  popupRoot.render(
    createElement(StrictMode, null,
      createElement(Popup, { state: popupState, onClose: handleClose })
    )
  );
}

function handleDismiss() {
  currentSelection = null;
  renderAll();
}

function handleClose() {
  removeHighlight();
  popupState = { phase: "IDLE" };
  currentSelection = null;
  renderAll();
}

async function handleCapture(text: string) {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    applyHighlight(sel.getRangeAt(0).cloneRange());
  }

  const sentence = (() => {
    const s = window.getSelection();
    if (!s || s.rangeCount === 0) return text;
    try { return extractSentence(s.getRangeAt(0)); } catch { return text; }
  })();

  currentSelection = null;
  popupState = { phase: "SAVING" };
  renderAll();

  try {
    const result = await sendCapture({
      word: text,
      sentence,
      sourceUrl: location.href,
      sourceTitle: document.title,
      capturedAt: new Date().toISOString(),
    });
    popupState = popupStateFromResult(result);
  } catch {
    popupState = { phase: "ERROR", message: "Extension error — could not send message" };
  }

  renderAll();
}

renderAll();
initSelectionDetector((sel) => {
  currentSelection = sel;
  renderAll();
});
