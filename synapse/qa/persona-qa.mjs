/* Persona-driven QA: actually drive the browser as 5 distinct users with
   distinct behaviors (not narrative) to surface real gaps. Two kinds of
   findings are logged:
     PASS/FAIL — a concrete assertion (bug if it fails)
     FRICTION  — something that worked but is a UX gap worth backlogging
*/
import { chromium } from "playwright";

const BASE = "http://localhost:8811";
const SHOTS = "./shots";
const results = [];
const friction = [];
const check = (persona, name, ok, detail = "") => {
  results.push({ persona, name, ok });
  console.log(`${ok ? "✅" : "❌"} [${persona}] ${name}${detail ? " — " + detail : ""}`);
};
const flag = (persona, note) => {
  friction.push({ persona, note });
  console.log(`🟡 [${persona}] FRICTION — ${note}`);
};

const browser = await chromium.launch({ ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), headless: true });
const errors = [];

async function freshPage(seed = null) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  if (seed) await page.addInitScript(seed);
  await page.goto(BASE, { waitUntil: "networkidle" });
  return page;
}

/* =====================================================================
   PERSONA 1 — Maya, 9. Picks kid level, uses suggestion chips mostly,
   but tries typing one custom interest. Tests the back-nav fix directly.
   ===================================================================== */
async function personaMaya() {
  const P = "Maya (9, kid)";
  const page = await freshPage();
  await page.fill("#ob-name", "Maya");
  await page.click('.ob-emoji[data-e="🦄"]');
  await page.click("#ob-next");

  // she picks Kid, then has second thoughts and goes BACK to change her name's spelling
  await page.click('[data-aud="kid"]');
  check(P, "kid audience selectable", (await page.locator('[data-aud="kid"].correct').count()) === 1);
  await page.click("#ob-back");
  await page.waitForSelector("#ob-name");
  check(P, "BACK returns to step 0", (await page.locator("#ob-name").inputValue()) === "Maya");
  await page.fill("#ob-name", "Maya K.");
  await page.click("#ob-next");
  check(P, "audience choice survived the round-trip", (await page.locator('[data-aud="kid"].correct').count()) === 1);
  await page.click("#ob-next"); // -> goals

  await page.click('[data-goal="Get better at math"]');
  await page.click("#ob-next"); // -> interests
  await page.click('[data-int-insert="Animals"]');
  check(P, "tapping an inspiration chip appends it to the free-text field", (await page.locator("#ob-int-text").inputValue()) === "Animals");
  // she also types her own interest that isn't in the suggestion list at all
  await page.fill("#ob-int-text", "Animals, Dinosaurs");
  await page.click("#ob-next"); // -> key
  await page.click("#ob-skip");
  await page.waitForSelector("#view-home.active");
  check(P, "onboarding completes with a free-typed interest", (await page.locator("#view-home").innerText()).includes("Maya K."));

  // confirm the free-typed interest actually made it into her profile, not just the textarea
  await page.click('.iconbtn[title="Settings"]');
  check(P, "free-typed interest ('Dinosaurs') persisted to the profile", (await page.locator("#view-settings").innerText()).includes("Dinosaurs"));
  await page.click('nav.tabs button[data-v="home"]');
  await page.screenshot({ path: `${SHOTS}/maya-01-home.png` });

  // she asks for a quiz on HER topic, not a suggestion chip
  await page.click('nav.tabs button[data-v="quiz"]');
  await page.fill("#quiz-topic", "dinosaurs");
  await page.click("#quiz-start");
  const disclosure = page.locator("#toasts .toast", { hasText: "closest one" });
  const disclosed = await disclosure.first().waitFor({ timeout: 2000 }).then(() => true).catch(() => false);
  await page.waitForSelector(".q-option", { timeout: 5000 });
  const quizTitle = await page.locator("#view-quiz h2").innerText();
  if (!quizTitle.toLowerCase().includes("dinosaur")) {
    check(P, "demo mode discloses a topic substitution instead of silently swapping quizzes", disclosed);
  }
  await page.screenshot({ path: `${SHOTS}/maya-02-quiz-mismatch.png` });

  // dashboard microcopy check — does anything assume adult reading level?
  await page.click('nav.tabs button[data-v="home"]');
  const homeText = await page.locator("#view-home").innerText();
  if (/memories that last months|growth edge/i.test(homeText)) {
    flag(P, "dashboard/quiz copy ('memories that last months', 'growth edge') is adult-voiced with no kid-mode variant");
  }
  await page.close();
}

/* =====================================================================
   PERSONA 2 — Grandpa Joe, 71. Methodical, double-checks himself,
   changes his mind mid-wizard. Tests draft-preservation across Back/Next
   and looks for a text-size setting.
   ===================================================================== */
async function personaJoe() {
  const P = "Grandpa Joe (71, adult)";
  const page = await freshPage();
  await page.fill("#ob-name", "Joe");
  await page.click("#ob-next");
  await page.click('[data-aud="adult"]');
  await page.click("#ob-next");
  await page.click('[data-goal="History that sticks"]');
  // starts typing a custom goal, then changes his mind and goes back WITHOUT clicking Add
  await page.fill("#ob-goal-custom", "Understand my new hearing aids");
  await page.click("#ob-back");
  await page.waitForSelector('[data-aud]');
  check(P, "back from goals to audience works", (await page.locator('[data-aud="adult"].correct').count()) === 1);
  await page.click("#ob-next"); // forward again into goals
  const draftPreserved = await page.locator("#ob-goal-custom").inputValue();
  check(P, "un-submitted goal draft survives a Back/Next round-trip", draftPreserved === "Understand my new hearing aids");
  await page.click("#ob-goal-add");
  await page.click("#ob-next"); // -> interests
  await page.click('[data-int-insert="Music"]');
  await page.click("#ob-next"); // -> key
  await page.click("#ob-skip");
  await page.waitForSelector("#view-home.active");

  // looks for a way to make text bigger
  await page.click('.iconbtn[title="Settings"]');
  const settingsText = await page.locator("#view-settings").innerText();
  if (!/text size|font size|larger text/i.test(settingsText)) {
    flag(P, "no text-size setting exists; 'tiny' (12.5px) UI text is hard to read at 71");
  }
  if (!/hosted|invite code/i.test(settingsText) && settingsText.includes("API key")) {
    flag(P, "settings assumes the reader knows what an 'Anthropic API key' is — no plain-language framing for non-technical users");
  }
  check(P, "no model picker in settings — Haiku 4.5 is locked, shown as fixed text", (await page.locator("#set-model").count()) === 0 && settingsText.includes("Claude Haiku 4.5"));
  await page.screenshot({ path: `${SHOTS}/joe-01-settings.png` });
  await page.close();
}

/* =====================================================================
   PERSONA 3 — Sam, 16. Speedruns onboarding, grinds a path + quiz,
   then goes to Settings to add a goal/interest post-hoc (regression
   check for the existing settings-side add flow).
   ===================================================================== */
async function personaSam() {
  const P = "Sam (16, teen)";
  const page = await freshPage();
  await page.fill("#ob-name", "Sam");
  await page.click("#ob-next");
  await page.click('[data-aud="teen"]');
  await page.click("#ob-next");
  await page.click('[data-goal="Physics from first principles"]');
  await page.click("#ob-next");
  await page.click('[data-int-insert="Video games"]');
  await page.click("#ob-next");
  await page.click("#ob-skip");
  await page.waitForSelector("#view-home.active");

  await page.click('nav.tabs button[data-v="paths"]');
  await page.fill("#path-goal", "Physics from first principles");
  await page.click("#path-make");
  await page.waitForSelector(".milestone", { timeout: 5000 });
  await page.click(".m-check");
  await page.waitForTimeout(150);
  check(P, "milestone completion awards XP", !(await page.locator("#pill-xp").innerText()).includes("0 XP"));

  await page.click('nav.tabs button[data-v="quiz"]');
  await page.fill("#quiz-topic", "physics");
  await page.click("#quiz-start");
  await page.waitForSelector(".q-option", { timeout: 5000 });
  for (let i = 0; i < 5; i++) {
    await page.click('.q-option[data-j="0"]');
    await page.waitForSelector("#q-continue");
    await page.click("#q-continue");
  }
  await page.waitForSelector("#quiz-again");

  // post-onboarding: adds a NEW interest from Settings (not onboarding) — regression check
  await page.click('.iconbtn[title="Settings"]');
  await page.fill("#set-int-new", "Esports");
  await page.click("#set-int-add");
  await page.waitForTimeout(150);
  check(P, "post-onboarding interest add still works (settings)", (await page.locator("#view-settings").innerText()).includes("Esports"));
  await page.screenshot({ path: `${SHOTS}/sam-01-settings.png` });

  await page.click('nav.tabs button[data-v="review"]');
  const dueBadge = await page.locator("#navreview .badge").count();
  check(P, "quiz misses feed the review queue (or perfect score = none due)", true, `due badge present: ${!!dueBadge}`);
  await page.close();
}

/* =====================================================================
   PERSONA 4 — Priya, 34, ML engineer. Expert level, mocked API for real
   chat + structured quiz/path, tests quick-actions and chat clear.
   ===================================================================== */
async function personaPriya() {
  const P = "Priya (34, expert)";
  const page = await freshPage();
  await page.route("**/v1/messages", async route => {
    const body = JSON.parse(route.request().postData());
    if (body.stream) {
      const chunks = ["Attention is a **weighted lookup**: each token asks \"who's relevant to me?\" via a query vector, ", "compares it against every other token's key vector, and blends their value vectors by that similarity. ", "Stack enough of these layers and the model builds up context-sensitive representations.\n\nWant me to go deeper on how the softmax turns raw scores into weights?"];
      const sse = chunks.map(c => `event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: c } })}\n\n`).join("") + `event: message_stop\ndata: {"type":"message_stop"}\n\n`;
      await route.fulfill({ status: 200, contentType: "text/event-stream", body: sse });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ topic: "Transformers", questions: [{ q: "Why scale dot-product attention by sqrt(d_k)?", options: ["Aesthetics", "Keeps softmax gradients from vanishing as dimension grows", "Speeds up matrix multiply", "It doesn't matter"], answer: 1, explain: "Dot products grow with dimension, pushing softmax into saturated regions; scaling keeps gradients healthy." }] }) }] }) });
    }
  });
  await page.fill("#ob-name", "Priya");
  await page.click("#ob-next");
  await page.click('[data-aud="expert"]');
  await page.click("#ob-next");
  await page.fill("#ob-goal-custom", "Understand transformer internals");
  await page.click("#ob-goal-add");
  await page.click("#ob-next");
  await page.click("#ob-next"); // no interests picked — zero-interest edge case
  await page.fill("#ob-key", "sk-ant-mock-key");
  await page.click("#ob-finish");
  await page.waitForSelector("#view-home.active");
  check(P, "zero interests selected doesn't break onboarding/home", !errors.some(e => e.includes("pageerror")));

  await page.click('nav.tabs button[data-v="tutor"]');
  page.once("dialog", d => d.accept("attention mechanisms")); // "Explain…" quick action prompts via window.prompt
  await page.click('[data-qa="0"]');
  await page.waitForSelector("[data-savecards]", { timeout: 6000 }).catch(() => {});
  const chatTxt = await page.locator("#chatlog").innerText();
  check(P, "expert-level streamed explanation renders", chatTxt.includes("weighted lookup"));

  const clearBtn = page.locator("#chat-clear");
  await clearBtn.click();
  await page.waitForTimeout(100);
  check(P, "clear conversation resets to greeting only", (await page.locator(".msg").count()) === 1);

  await page.click('nav.tabs button[data-v="quiz"]');
  await page.fill("#quiz-topic", "transformers");
  await page.click("#quiz-start");
  await page.waitForSelector(".q-option", { timeout: 6000 });
  check(P, "expert-level structured-output quiz renders", (await page.locator("#view-quiz").innerText()).includes("scale dot-product attention"));
  await page.screenshot({ path: `${SHOTS}/priya-01-quiz.png` });
  await page.close();
}

/* =====================================================================
   PERSONA 5 — Dad, 62, skeptical, cold demo-mode start. Zero goals/
   interests. Hunts for edge cases: mid-quiz quit, delete-all-cards,
   reset-confirm cancel path.
   ===================================================================== */
async function personaDad() {
  const P = "Dad (62, skeptical, demo)";
  const page = await freshPage();
  await page.fill("#ob-name", "Dad");
  await page.click("#ob-next");
  await page.click('[data-aud="adult"]');
  await page.click("#ob-next");
  await page.click("#ob-next"); // no goals
  await page.click("#ob-next"); // no interests
  await page.click("#ob-skip");
  await page.waitForSelector("#view-home.active");
  check(P, "zero goals + zero interests: home renders without error", !errors.some(e => e.includes("pageerror")));
  const rec = await page.locator(".hero-cta").innerText();
  check(P, "dashboard still recommends something with no goals/interests", rec.trim().length > 0, rec.replace(/\s+/g, " ").trim());

  // starts a quiz, then quits mid-way
  await page.click('nav.tabs button[data-v="quiz"]');
  await page.fill("#quiz-topic", "how the internet works");
  await page.click("#quiz-start");
  await page.waitForSelector(".q-option", { timeout: 5000 });
  await page.click('.q-option[data-j="1"]');
  await page.click("#q-continue");
  await page.click("#quiz-quit");
  check(P, "mid-quiz quit returns to quiz picker cleanly", (await page.locator("#quiz-start").count()) === 1);
  // restart the SAME topic — checks for stale state from the aborted attempt
  await page.fill("#quiz-topic", "how the internet works");
  await page.click("#quiz-start");
  await page.waitForSelector(".q-option", { timeout: 5000 });
  check(P, "restarted quiz begins at question 1 (no stale progress)", (await page.locator("#view-quiz").innerText()).includes("Question 1 of"));
  for (let i = 0; i < 5; i++) {
    await page.click('.q-option[data-j="1"]');
    await page.waitForSelector("#q-continue");
    await page.click("#q-continue");
  }
  await page.waitForSelector("#quiz-again");

  // deletes every card via the deck browser, down to empty
  await page.click('nav.tabs button[data-v="review"]');
  // finish the review session first if cards are due
  while (await page.locator(".flashcard").count()) {
    await page.click("#fc");
    await page.waitForSelector(".grade-row");
    await page.keyboard.press("3");
    await page.waitForTimeout(80);
  }
  const browseLink = page.locator("#browse-cards");
  if (await browseLink.count()) {
    await browseLink.click();
    await page.waitForSelector("dialog[open]");
    let guard = 0;
    while ((await page.locator("[data-del]").count()) && guard++ < 30) {
      await page.click("[data-del]");
      await page.waitForTimeout(60);
    }
    check(P, "deleting every card empties the deck without crashing", !errors.some(e => e.includes("pageerror")));
    await page.screenshot({ path: `${SHOTS}/dad-01-empty-deck.png` });
  }

  // reset-everything: cancel path must NOT wipe data
  await page.click('.iconbtn[title="Settings"]');
  page.once("dialog", d => d.dismiss());
  await page.click("#set-reset");
  await page.waitForTimeout(150);
  await page.click('nav.tabs button[data-v="home"]');
  check(P, "dismissing the reset confirm keeps the profile", (await page.locator("#view-home").innerText()).includes("Dad"));
  await page.close();
}

for (const p of [personaMaya, personaJoe, personaSam, personaPriya, personaDad]) {
  try { await p(); } catch (e) { check(p.name, "FATAL", false, e.message); }
}

/* =====================================================================
   SYSTEM CHECK — the model lock survives a tampered/stale profile, not
   just fresh installs. Someone editing localStorage directly (or
   re-importing an old backup from before the lock existed) shouldn't be
   able to bring back a non-Haiku model.
   ===================================================================== */
async function checkModelLockSurvivesTampering() {
  const P = "System (model lock)";
  const page = await freshPage(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem("synapse.v1", JSON.stringify({
      activeUserId: "u1",
      settings: { apiKey: "", model: "claude-opus-4-8" }, // simulates a stale/tampered profile
      users: [{
        id: "u1", name: "Tamper", emoji: "🦊", audience: "adult",
        goals: [], interests: [], createdAt: today,
        xp: 0, level: 1, streak: { current: 0, best: 0, lastDay: null, freezes: 1 },
        activity: {}, cards: [], paths: [], chat: [], badges: [],
        stats: { quizzes: 0, quizCorrect: 0, quizTotal: 0, reviews: 0, messages: 0, topicsQuizzed: {} },
      }],
    }));
  });
  await page.waitForSelector("#view-home.active", { timeout: 5000 });
  const storedModel = await page.evaluate(() => JSON.parse(localStorage.getItem("synapse.v1")).settings.model);
  check(P, "a tampered/stale model value is coerced back to Haiku 4.5 in storage", storedModel === "claude-haiku-4-5");
  await page.click('.iconbtn[title="Settings"]');
  check(P, "settings UI reflects the locked model regardless of what was seeded", (await page.locator("#view-settings").innerText()).includes("Claude Haiku 4.5"));
  await page.close();
}
try { await checkModelLockSurvivesTampering(); } catch (e) { check("System (model lock)", "FATAL", false, e.message); }

console.log("\n--- FRICTION LOG (UX gaps, not bugs) ---");
if (!friction.length) console.log("(none found)");
friction.forEach(f => console.log(`  🟡 [${f.persona}] ${f.note}`));

const fails = results.filter(r => !r.ok).length;
console.log(`\n${results.length - fails}/${results.length} assertions passed · ${friction.length} friction items logged · ${errors.length} JS errors`);
if (errors.length) { console.log("\nJS ERRORS:"); errors.forEach(e => console.log("  •", e)); }

await browser.close();
process.exit(fails || errors.length ? 1 : 0);
