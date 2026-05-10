# 03 — Sentence extractor

- **Type**: AFK
- **Blocked by**: 01
- **Stories**: 18

## What to build

A pure function that accepts a DOM Range and returns the full sentence containing the selection as a plain string. Walks the text nodes of the containing block element — no DOM mutation, no side effects. Unit tested against edge cases.

## Acceptance criteria

- [ ] Returns the sentence containing the selection, not just the selected text
- [ ] Handles selection at the start or end of a sentence
- [ ] Handles inline elements (e.g. `<strong>`, `<em>`) mid-sentence without breaking the text
- [ ] Handles multiple sentences in a single block element — returns only the one containing the selection
- [ ] Pure function: no DOM mutation, no global state
- [ ] Unit tests cover all edge cases above and pass
