# 05 — Popup (shadow DOM) + state machine

- **Type**: AFK
- **Blocked by**: 02, 03, 04
- **Stories**: 4, 5, 6, 7, 8, 9, 12, 13, 14, 15

## What to build

A React component tree mounted inside a shadow root attached to a `div` injected into `<body>`. Completely isolated from page CSS. Wired to the capture button: clicking it sends `CAPTURE_WORD` via the message bus and transitions the popup through its state machine.

State machine:

```
IDLE → SAVING → DONE | ERROR | DUPLICATE
```

- **IDLE**: not rendered
- **SAVING**: spinner + "Saving..."
- **DONE**: Polish translation + close button; selected word stays highlighted until closed
- **ERROR**: error message; auto-dismisses after 3s
- **DUPLICATE**: informs user word exists, shows its current status

## Acceptance criteria

- [ ] Popup renders inside a shadow root — page CSS does not bleed in
- [ ] Capture button click triggers SAVING state (spinner visible) while request is in flight
- [ ] DONE state shows Polish translation and a close button
- [ ] Selected word remains highlighted until the popup is closed
- [ ] Close button returns to IDLE
- [ ] DUPLICATE state shows the existing word's status
- [ ] ERROR state shows a message and auto-dismisses after 3 seconds
- [ ] Popup auto-closes after DONE state is shown (with reasonable delay)
- [ ] No popup shown for IDLE state
