# 02 — Selection detector + capture button

- **Type**: AFK
- **Blocked by**: 01
- **Stories**: 1, 2, 3, 10, 11

## What to build

A `mouseup` listener in the content script that fires when the user selects text. If the selection is 1–5 words, a floating capture button appears above the selection bounding rect (never below, never obscuring upcoming text). The button dismisses on `mousedown` outside it or when a new selection begins. Selections longer than 5 words are silently ignored.

## Acceptance criteria

- [ ] Button appears above (not below) the selection rect for 1–5 word selections
- [ ] Button is `position: fixed` relative to the viewport
- [ ] Button dismisses on outside `mousedown`
- [ ] Button dismisses when a new selection starts
- [ ] Selections of 6+ words produce no button
- [ ] Empty selections produce no button
