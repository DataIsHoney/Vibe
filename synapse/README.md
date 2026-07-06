# 🧠 Synapse — Your Personal AI Tutor

A Claude-powered tutoring app focused on **actually retaining** what you learn.

**Live:** `https://subwaymath.com/synapse/` (once merged to main)

## What it does

| Feature | How |
|---|---|
| **Tutor chat** | Streaming Claude conversations. First-principles explanations by default, calibrated to your level (kid → deep technical), grounded in your interests for analogies. Explicitly instructed to say *"I'm not certain"* rather than fabricate. |
| **Quizzes** | 5-question MCQ on any topic, generated with structured outputs (guaranteed-valid JSON). Misses become flashcards in one tap. |
| **Spaced repetition** | SM-2 scheduling. Cards flow in from quiz misses and tutor conversations (the model proposes cards for retention-worthy facts). Keyboard-driven review (space, 1-4). |
| **Learning paths** | Turn a goal into a milestone plan; every topic is one tap from a tutor session or quiz. |
| **Motivation** | Daily streaks *with streak freezes* (forgiveness — a bad day doesn't nuke your progress), XP, levels, badges, 7-day activity chart, one recommended next action on the dashboard. |
| **Profiles** | Multiple learners per device (family & friends), each with their own deck, paths, and progress. |
| **Demo mode** | Fully explorable without an API key: built-in quizzes, starter deck, demo paths. |

## Architecture

Buildless static app — ES modules, no framework, no bundler. Deploys straight to GitHub Pages.

```
synapse/
├── index.html          app shell
├── css/app.css         design system (dark, mint/sky accent, Space Grotesk + Inter)
└── js/
    ├── app.js          entry: registers views, boots
    ├── router.js       tiny view router
    ├── state.js        localStorage persistence, user model, XP/streaks/badges
    ├── srs.js          SM-2 spaced-repetition scheduler
    ├── api.js          Claude API client (streaming + structured outputs)
    ├── demo.js         no-key demo content
    ├── shell.js        header/nav chrome
    └── views/          onboarding, home, tutor, quiz, review, paths, settings
```

- **Model:** locked to `claude-haiku-4-5` for everyone — no user-facing picker, so per-session cost stays predictable as usage grows. Enforced in `state.js`, not just defaulted, so it can't be reintroduced via a stale profile or a re-imported backup.
- **API:** raw `fetch` against `api.anthropic.com/v1/messages` with the
  `anthropic-dangerous-direct-browser-access` CORS header — BYO key, stored in
  localStorage, sent only to Anthropic. No backend, no key custody.
- **Data:** everything in `localStorage` (`synapse.v1`), with JSON export/import.

## Run locally

ES modules need a server (not `file://`):

```bash
cd synapse && python3 -m http.server 8080
# open http://localhost:8080
```

## Product docs

PRD, evaluation report, QA report, user-testing feedback, and backlog live in the
[`DataIsHoney/enablement`](https://github.com/DataIsHoney/enablement) repo under `synapse/`.
