import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import { extractSentence } from "./sentenceExtractor";

// Point the module's globals at jsdom's window
let dom: JSDOM;

beforeEach(() => {
  dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).document = dom.window.document;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Node = dom.window.Node;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).NodeFilter = dom.window.NodeFilter;
});

function makeRange(
  container: Node,
  startTextNode: Text,
  startOffset: number
): Range {
  const range = dom.window.document.createRange();
  range.setStart(startTextNode, startOffset);
  range.setEnd(startTextNode, startOffset + 1);
  return range;
}

describe("extractSentence", () => {
  it("returns the sentence containing the selection", () => {
    const p = dom.window.document.createElement("p");
    p.textContent = "Hello world. Foo bar. Baz qux.";
    dom.window.document.body.appendChild(p);

    const textNode = p.firstChild as Text;
    // offset 13 = start of "Foo bar."
    const range = makeRange(p, textNode, 13);
    expect(extractSentence(range)).toBe("Foo bar.");
  });

  it("handles selection at start of sentence", () => {
    const p = dom.window.document.createElement("p");
    p.textContent = "First sentence. Second sentence.";
    dom.window.document.body.appendChild(p);

    const textNode = p.firstChild as Text;
    const range = makeRange(p, textNode, 0);
    expect(extractSentence(range)).toBe("First sentence.");
  });

  it("handles selection at end of sentence", () => {
    const p = dom.window.document.createElement("p");
    p.textContent = "First sentence. Second sentence.";
    dom.window.document.body.appendChild(p);

    const textNode = p.firstChild as Text;
    // offset 14 = the "." of "First sentence."
    const range = makeRange(p, textNode, 14);
    expect(extractSentence(range)).toBe("First sentence.");
  });

  it("handles inline elements mid-sentence without breaking text", () => {
    const p = dom.window.document.createElement("p");
    p.innerHTML = "She was <strong>very</strong> happy. Next sentence.";
    dom.window.document.body.appendChild(p);

    // Select "very" inside <strong>
    const strong = p.querySelector("strong")!;
    const textNode = strong.firstChild as Text;
    const range = makeRange(p, textNode, 0);
    expect(extractSentence(range)).toBe("She was very happy.");
  });

  it("handles multiple sentences — returns only the one with the selection", () => {
    const p = dom.window.document.createElement("p");
    p.textContent = "One. Two. Three. Four. Five.";
    dom.window.document.body.appendChild(p);

    const textNode = p.firstChild as Text;
    // offset 10 = start of "Three."
    const range = makeRange(p, textNode, 10);
    expect(extractSentence(range)).toBe("Three.");
  });

  it("handles single sentence with no punctuation", () => {
    const p = dom.window.document.createElement("p");
    p.textContent = "Just one phrase here";
    dom.window.document.body.appendChild(p);

    const textNode = p.firstChild as Text;
    const range = makeRange(p, textNode, 5);
    expect(extractSentence(range)).toBe("Just one phrase here");
  });

  it("handles exclamation and question marks", () => {
    const p = dom.window.document.createElement("p");
    p.textContent = "Really? Yes! Of course.";
    dom.window.document.body.appendChild(p);

    const textNode = p.firstChild as Text;
    // offset 8 = start of "Yes!"
    const range = makeRange(p, textNode, 8);
    expect(extractSentence(range)).toBe("Yes!");
  });
});
