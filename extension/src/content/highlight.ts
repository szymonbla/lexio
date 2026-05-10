const HIGHLIGHT_ID = "lexio-highlight";

export function applyHighlight(range: Range): void {
  try {
    const span = document.createElement("span");
    span.id = HIGHLIGHT_ID;
    span.style.cssText = "background: #ffe066 !important; color: inherit !important;";
    range.surroundContents(span);
  } catch {
    // range crosses element boundaries — skip highlight rather than mutate DOM
  }
}

export function removeHighlight(): void {
  const span = document.getElementById(HIGHLIGHT_ID);
  if (!span) return;
  const parent = span.parentNode;
  if (!parent) return;
  while (span.firstChild) parent.insertBefore(span.firstChild, span);
  parent.removeChild(span);
}
