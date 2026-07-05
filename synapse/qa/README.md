# Synapse QA suite

Playwright end-to-end tests. Two suites:

- `qa.mjs` — full user journey in **demo mode** (no API key): onboarding,
  dashboard, quiz, spaced-repetition review (incl. keyboard), tutor, paths,
  settings, persistence across reload, mobile + desktop viewports. 34 checks.
- `qa-api.mjs` — the **connected** code paths with a mocked Anthropic API:
  SSE streaming parse, `<flashcards>` extraction, structured-output quiz/path
  parsing, and friendly 401 error surfacing. 9 checks.

Run:

```bash
cd synapse && python3 -m http.server 8811 &   # serve the app
npm i playwright                               # or use a global install
mkdir -p qa/shots && node qa/qa.mjs && node qa/qa-api.mjs
```

Screenshots land in `qa/shots/` (gitignored).
