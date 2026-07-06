# Synapse QA suite

Playwright end-to-end tests. Three suites:

- `qa.mjs` — full user journey in **demo mode** (no API key): onboarding,
  dashboard, quiz, spaced-repetition review (incl. keyboard), tutor, paths,
  settings, persistence across reload, mobile + desktop viewports. 34 checks.
- `qa-api.mjs` — the **connected** code paths with a mocked Anthropic API:
  SSE streaming parse, `<flashcards>` extraction, structured-output quiz/path
  parsing, and friendly 401 error surfacing. 9 checks.
- `persona-qa.mjs` — **five distinct users actually driving the browser**
  (not narrative personas): a kid who types her own interest instead of
  picking a chip, a senior who changes his mind mid-wizard, a teen who
  grinds a path, an expert on the mocked API, and a skeptical demo-mode
  user probing edge cases (zero goals/interests, mid-quiz quit, deleting
  every flashcard, cancelling a destructive reset). Logs two kinds of
  findings: ✅/❌ assertions (bugs if failing) and 🟡 FRICTION notes (real
  UX gaps that work but should be backlogged). 20 checks.

Run:

```bash
cd synapse && python3 -m http.server 8811 &   # serve the app
npm i playwright                               # or use a global install
mkdir -p qa/shots && node qa/qa.mjs && node qa/qa-api.mjs && node qa/persona-qa.mjs
```

Screenshots land in `qa/shots/` (gitignored). Set `PW_CHROMIUM=/path/to/chromium`
if Playwright's bundled browser isn't at the default install location.
