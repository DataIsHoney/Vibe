# Continuation Context — Claude Architect Guide

## Branch
`claude/architect-cert-guide-LzBy6`

## What This Task Is
Build an interactive HTML guide viewer and upgrade remaining markdown chapters for the Claude Architect Certification Study Guide at `/home/user/Vibe/guide/`.

---

## ✅ Already Done (committed)

| Commit | What |
|--------|------|
| `12c716d` | Ch03 (Tool Use) — upgraded to comprehensive version |
| `d60577a` | Ch05 (Safety) — upgraded to comprehensive version |
| `ff9789a` | Ch06 (Context Windows) — upgraded to comprehensive version |
| `9d11460` | Ch01 (API Foundations) — upgraded to comprehensive version |

---

## ❌ Remaining Work (in order, commit after each)

### 1. Create `guide/index.html` — Interactive Viewer
**File to create:** `/home/user/Vibe/guide/index.html`

Single self-contained HTML file that:
- Fetches and renders all 10 markdown chapters (`guide/chapters/ch01-*.md` … `ch10-*.md`) using **marked.js** CDN
- Syntax highlights code blocks using **highlight.js** CDN + adds copy buttons
- Dark theme: bg `#050810`, card `#0d1117`, red `#EE352E`, green `#6CBE45`, orange `#FF6319`, Inter font
- Sticky sidebar: chapter navigation links + progress bar (chapters visited / 10)
- Mobile responsive: hamburger menu collapses sidebar on small screens
- **6 interactive widgets** injected by detecting specific headings in rendered HTML:

| Widget | Chapter | Inject after heading |
|--------|---------|----------------------|
| Tool Use Cycle Flowchart (step-by-step, Next → button) | ch03 | `3.2 The Mental Model` |
| Trust Hierarchy Pyramid (SVG, click layers to expand) | ch05 | `5.4 The Trust Hierarchy` |
| Context Window Visualizer (fillable bar, add tokens) | ch06 | `6.4 What Is a Context Window` |
| Model Comparison Cards (Speed/Cost/Power bars) | ch07 | `Model Comparison Table` |
| Token Calculator (textarea → live token count + cost) | ch08 | `Approximate Pricing Reference` |
| Knowledge Check quiz (3 MCQ per chapter, instant feedback) | all ch01–ch08 | end of each chapter |

**Quiz questions per chapter** (answer index is 0-based):
```javascript
// ch01: Q correct answers: 1, 1, 2
// ch02: Q correct answers: 1, 3, 1
// ch03: Q correct answers: 1, 2, 1
// ch04: Q correct answers: 1, 1, 1
// ch05: Q correct answers: 2, 2, 1
// ch06: Q correct answers: 2, 1, 1
// ch07: Q correct answers: 2, 1, 1
// ch08: Q correct answers: 1, 1, 2
// Full questions in /home/user/Vibe/guide/chapters/ch09-practice-questions.md
```

**Commit message:**
```
Add guide/index.html — interactive study guide viewer

Self-contained HTML viewer with sidebar nav, markdown rendering via
marked.js, syntax highlighting, copy buttons, 6 interactive widgets
(Token Calculator, Model Cards, Trust Pyramid, Context Visualizer,
Tool Use Cycle, Knowledge Checks).
```

---

### 2. Upgrade Ch02 — Prompt Engineering
**File:** `/home/user/Vibe/guide/chapters/ch02-prompt-engineering.md`

Current: 453 lines. Target: ~900 lines. Pattern: match Ch03/Ch05/Ch06 style.
- Add intro section with learning objectives
- Number sections (2.1, 2.2, etc.)
- Add extended chain-of-thought section (incl. when to use extended thinking)
- Add structured output / JSON mode section
- Add adversarial testing section
- Add meta-prompting techniques
- More worked examples

**Commit message:** `Upgrade Ch02 (Prompt Engineering) with comprehensive version`

---

### 3. Upgrade Ch04 — Multi-Agent Systems
**File:** `/home/user/Vibe/guide/chapters/ch04-multi-agent.md`

Current: 336 lines. Target: ~800 lines.
- Add intro with learning objectives
- Number sections (4.1, 4.2, etc.)
- Add routing agent pattern
- Add human-in-the-loop section
- Add checkpointing and resilience patterns
- Add production considerations (monitoring, error recovery)
- More worked examples

**Commit message:** `Upgrade Ch04 (Multi-Agent Systems) with comprehensive version`

---

### 4. Upgrade Ch07 — Model Selection
**File:** `/home/user/Vibe/guide/chapters/ch07-model-selection.md`

Current: 332 lines. Target: ~700 lines.
- Add intro with learning objectives
- Number sections
- Expand extended thinking / claude-opus usage section
- Add feature comparison matrix (vision, tool use, context, etc.)
- Add future-proofing strategy section
- More on when vision adds value

**Commit message:** `Upgrade Ch07 (Model Selection) with comprehensive version`

---

### 5. Upgrade Ch08 — Cost Optimization
**File:** `/home/user/Vibe/guide/chapters/ch08-cost-optimization.md`

Current: 458 lines. Target: ~800 lines.
- Add intro with learning objectives
- Number sections
- Add extended thinking cost considerations
- Add multi-tenant cost allocation patterns
- Add cost monitoring and alerting section
- More detailed batch API workflow
- Add cost optimization decision flowchart

**Commit message:** `Upgrade Ch08 (Cost Optimization) with comprehensive version`

---

### 6. Push All Commits
```bash
git push -u origin claude/architect-cert-guide-LzBy6
```

---

## Key File Locations
```
/home/user/Vibe/guide/
  index.html                          ← CREATE THIS
  chapters/
    ch01-api-foundations.md           ✅ upgraded
    ch02-prompt-engineering.md        ❌ needs upgrade
    ch03-tool-use.md                  ✅ upgraded
    ch04-multi-agent.md               ❌ needs upgrade
    ch05-safety.md                    ✅ upgraded
    ch06-context-system-prompts.md    ✅ upgraded
    ch07-model-selection.md           ❌ needs upgrade
    ch08-cost-optimization.md         ❌ needs upgrade
    ch09-practice-questions.md        (source for quiz questions)
    ch10-quick-reference.md           (no upgrade needed)
```

## Design System (match existing project files)
```css
--bg: #050810;
--card-bg: #0d1117;
--red: #EE352E;
--orange: #FF6319;
--green: #6CBE45;
--yellow: #FCCC0A;
font-family: 'Inter', sans-serif;
```

## Important: Commit After Every File
Do NOT batch multiple files into one session. Write one file → commit → write next file → commit. This ensures no work is lost if the session times out.
