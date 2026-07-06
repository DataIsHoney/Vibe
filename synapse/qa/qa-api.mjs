/* QA of the CONNECTED code paths with a mocked Anthropic API:
   - claudeStream SSE parsing + streaming render + <flashcards> extraction
   - claudeJSON structured-output quiz + path generation */
import { chromium } from "playwright";

const BASE = "http://localhost:8811";
const SHOTS = "./shots";
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`); };

const browser = await chromium.launch({ ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
const errors = [];
page.on("pageerror", e => errors.push("pageerror: " + e.message));

// seed a profile WITH an api key so the app takes the live-API branch
await page.addInitScript(() => {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem("synapse.v1", JSON.stringify({
    activeUserId: "u1",
    settings: { apiKey: "sk-ant-test-mock", model: "claude-haiku-4-5" }, // model is locked app-wide; state.js enforces this regardless of what's seeded here
    users: [{
      id: "u1", name: "Mocky", emoji: "🦉", audience: "adult",
      goals: ["Understand volcanoes"], interests: ["Nature"], createdAt: today,
      xp: 0, level: 1, streak: { current: 0, best: 0, lastDay: null, freezes: 1 },
      activity: {}, cards: [], paths: [], chat: [], badges: [],
      stats: { quizzes: 0, quizCorrect: 0, quizTotal: 0, reviews: 0, messages: 0, topicsQuizzed: {} },
    }],
  }));
});

// mock api.anthropic.com
const sse = chunks => chunks.map(c => `event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: c } })}\n\n`).join("") + `event: message_stop\ndata: {"type":"message_stop"}\n\n`;

await page.route("**/v1/messages", async route => {
  const body = JSON.parse(route.request().postData());
  if (body.stream) {
    const reply = [
      "**Volcanoes** are pressure-release valves for the planet. ",
      "Deep down, rock melts into magma; being less dense than the rock around it, it rises — ",
      "like a bubble in honey. Where the crust is weak, it breaks through.\n\nWhat do you think happens to the gas dissolved in that magma as it rises?",
      `\n\n<flashcards>[{"front":"Why does magma rise toward the surface?","back":"It is less dense than surrounding rock, so buoyancy pushes it up.","topic":"Volcanoes"}]</flashcards>`,
    ];
    await route.fulfill({ status: 200, contentType: "text/event-stream", body: sse(reply) });
  } else if (body.output_config?.format?.schema?.properties?.questions) {
    const quiz = { topic: "Volcanoes", questions: [
      { q: "What drives a volcanic eruption?", options: ["Wind pressure", "Buoyant magma and expanding gas", "Ocean tides", "Earth's rotation"], answer: 1, explain: "Dissolved gas expands as pressure drops — like opening a shaken soda." },
      { q: "Where do most volcanoes form?", options: ["Plate boundaries", "Continental centers", "Random spots", "The equator"], answer: 0, explain: "Weak crust at plate boundaries lets magma through." },
    ]};
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(quiz) }] }) });
  } else {
    const plan = { title: "Master Volcanoes", why: "Understand one of Earth's most powerful engines.", milestones: [
      { title: "The engine below", topics: ["Mantle convection", "How rock melts"] },
      { title: "Eruption mechanics", topics: ["Gas expansion", "Lava vs magma"] },
    ]};
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(plan) }] }) });
  }
});

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("#view-home.active");
  check("connected mode (no DEMO tag)", !(await page.locator("#view-home").innerText()).includes("DEMO MODE"));

  /* streaming chat + flashcard extraction */
  await page.click('nav.tabs button[data-v="tutor"]');
  await page.fill("#chat-in", "How do volcanoes work?");
  await page.click("#chat-send");
  await page.waitForSelector("[data-savecards]", { timeout: 8000 });
  const chat = await page.locator("#chatlog").innerText();
  check("streamed reply rendered", chat.includes("pressure-release valves"));
  check("flashcards block stripped from text", !chat.includes("<flashcards>"));
  check("flashcard suggestion chip", chat.includes("1 flashcard suggested"));
  await page.click("[data-savecards]");
  await page.waitForTimeout(200);
  check("card saved to deck", (await page.locator("#chatlog").innerText()).includes("saved"));
  await page.screenshot({ path: SHOTS + "/20-api-chat.png" });

  /* structured-output quiz */
  await page.click('nav.tabs button[data-v="quiz"]');
  await page.fill("#quiz-topic", "volcanoes");
  await page.click("#quiz-start");
  await page.waitForSelector(".q-option", { timeout: 8000 });
  check("structured-output quiz parsed", (await page.locator("#view-quiz").innerText()).includes("What drives a volcanic eruption?"));
  await page.click('.q-option[data-j="1"]');
  await page.waitForSelector(".explain");
  check("correct answer marked", (await page.locator(".q-option.correct").count()) === 1);

  /* structured-output path */
  await page.click('nav.tabs button[data-v="paths"]');
  await page.fill("#path-goal", "volcanoes");
  await page.click("#path-make");
  await page.waitForSelector(".milestone", { timeout: 8000 });
  check("structured-output path parsed", (await page.locator("#view-paths").innerText()).includes("Master Volcanoes"));
  await page.screenshot({ path: SHOTS + "/21-api-path.png" });

  /* API error surfacing: 401 */
  await page.unroute("**/v1/messages");
  await page.route("**/v1/messages", r => r.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: { message: "invalid x-api-key" } }) }));
  await page.click('nav.tabs button[data-v="tutor"]');
  await page.fill("#chat-in", "test error");
  await page.click("#chat-send");
  await page.waitForTimeout(600);
  check("401 surfaces friendly error", (await page.locator("#chatlog").innerText()).includes("Invalid API key"));
} catch (e) {
  check("FATAL", false, e.message);
  await page.screenshot({ path: SHOTS + "/98-api-fatal.png" }).catch(() => {});
}

if (errors.length) { console.log("\nJS ERRORS:"); errors.forEach(e => console.log("  •", e)); }
const fails = results.filter(r => !r.ok).length;
console.log(`\n${results.length - fails}/${results.length} checks passed, ${errors.length} JS errors`);
await browser.close();
process.exit(fails || errors.length ? 1 : 0);
