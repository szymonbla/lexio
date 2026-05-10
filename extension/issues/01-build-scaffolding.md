# 01 — Build scaffolding

- **Type**: AFK
- **Blocked by**: None — can start immediately
- **Stories**: 16, 17, 20 (partial)

## What to build

Set up the Vite + MV3 extension project with separate entry points for content script, background service worker, and options page. Options page provides a single API token input field persisted to `chrome.storage.sync`. Dev build loads as an unpacked extension from `dist/`.

Stack: Vite, `@vitejs/plugin-react`, `vite-plugin-web-extension`, TypeScript, MV3 manifest.

## Acceptance criteria

- [ ] `npm run dev` produces a `dist/` directory loadable as an unpacked Chrome extension
- [ ] Manifest declares `content_scripts`, `background.service_worker`, and `options_page`
- [ ] Options page renders an API token input; saving persists to `chrome.storage.sync`; reloading the page restores the saved value
- [ ] No `eval`, no inline scripts — CSP-compliant
- [ ] TypeScript strict mode enabled; build passes with no errors
