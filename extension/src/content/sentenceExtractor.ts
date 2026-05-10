const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DIV", "DL", "DT",
  "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3",
  "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P",
  "PRE", "SECTION", "SUMMARY", "TABLE", "TD", "TH", "UL",
]);

function isBlock(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE &&
    BLOCK_TAGS.has((node as Element).tagName);
}

function findBlockAncestor(node: Node): Node {
  let cur: Node | null = node;
  while (cur && cur !== document.body) {
    if (isBlock(cur)) return cur;
    cur = cur.parentNode;
  }
  return document.body ?? node;
}

function collectTextNodes(root: Node): Text[] {
  const result: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) result.push(n as Text);
  return result;
}

function buildFullText(textNodes: Text[]): { text: string; offsets: number[] } {
  const offsets: number[] = [];
  let text = "";
  for (const tn of textNodes) {
    offsets.push(text.length);
    text += tn.nodeValue ?? "";
  }
  return { text, offsets };
}

function charOffsetInBlock(range: Range, textNodes: Text[], offsets: number[]): number {
  const target = range.startContainer;
  const startOffset = range.startOffset;

  for (let i = 0; i < textNodes.length; i++) {
    if (textNodes[i] === target) return offsets[i] + startOffset;
  }
  // fallback: use first text node
  return 0;
}

// Split on sentence-ending punctuation followed by whitespace or end-of-string.
// Returns [sentence, startIndex][] so we can find which one covers a char offset.
function splitSentences(text: string): Array<{ sentence: string; start: number }> {
  const results: Array<{ sentence: string; start: number }> = [];
  const re = /[^.!?]*[.!?]+(?:\s+|$)|[^.!?]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    results.push({ sentence: m[0].trim(), start: m.index });
  }
  // If no sentence boundary found, return the whole text
  if (results.length === 0) results.push({ sentence: text.trim(), start: 0 });
  return results;
}

export function extractSentence(range: Range): string {
  const block = findBlockAncestor(range.startContainer);
  const textNodes = collectTextNodes(block);
  if (textNodes.length === 0) return "";

  const { text, offsets } = buildFullText(textNodes);
  const charOffset = charOffsetInBlock(range, textNodes, offsets);
  const sentences = splitSentences(text);

  for (let i = 0; i < sentences.length; i++) {
    const { sentence, start } = sentences[i];
    const end = start + sentence.length + (text[start + sentence.length] === " " ? 1 : 0);
    const nextStart = i + 1 < sentences.length ? sentences[i + 1].start : text.length;
    if (charOffset >= start && charOffset < nextStart) return sentence;
  }

  return sentences[sentences.length - 1].sentence;
}
