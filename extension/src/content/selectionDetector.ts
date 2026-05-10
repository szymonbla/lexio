export type SelectionEvent = {
  text: string;
  rect: DOMRect;
};

export type SelectionListener = (event: SelectionEvent | null) => void;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function initSelectionDetector(onSelection: SelectionListener): () => void {
  function handleMouseUp() {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";

    if (!text) {
      onSelection(null);
      return;
    }

    const words = countWords(text);
    if (words < 1 || words > 5) {
      onSelection(null);
      return;
    }

    const range = selection!.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    onSelection({ text, rect });
  }

  function handleSelectionStart() {
    onSelection(null);
  }

  document.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("selectstart", handleSelectionStart);

  return () => {
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("selectstart", handleSelectionStart);
  };
}
