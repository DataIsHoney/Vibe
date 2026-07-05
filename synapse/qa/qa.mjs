/* Synapse end-to-end QA: onboarding → home → quiz → review → tutor → paths → settings (demo mode). */
import { chromium } from "playwright";

const BASE = "http://localhost:8811";
const SHOTS = "./shots";
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`); };

const browser = await chromium.launch({ ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
const errors = [];
page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });

try {
  /* ---------- onboarding ---------- */
  await page.goto(BASE, { waitUntil: "networkidle" });
  check("app loads", await page.locator("#view-onboarding.active").count() === 1);
  await page.fill("#ob-name", "TestFox");
  await page.click('.ob-emoji[data-e="🐙"]');
  await page.click("#ob-next");
  check("step 2: audience", await page.locator('[data-aud="teen"]').count() === 1);
  await page.click('[data-aud="teen"]');
  await page.click("#ob-next");
  await page.click('[data-goal="Understand AI & how LLMs work"]');
  await page.fill("#ob-goal-custom", "Play chess better");
  await page.click("#ob-goal-add");
  check("custom goal chip added", await page.locator('#ob-goal-own .chip').count() === 1);
  await page.click("#ob-next");
  await page.click('[data-int="Space"]');
  await page.click('[data-int="Video games"]');
  await page.click("#ob-next");
  check("step 5: api key screen", await page.locator("#ob-skip").count() === 1);
  await page.screenshot({ path: SHOTS + "/01-onboarding.png" });
  await page.click("#ob-skip");
  await page.waitForSelector("#view-home.active");
  check("onboarding → home", true);

  /* ---------- home / dashboard ---------- */
  const homeText = await page.locator("#view-home").innerText();
  check("greeting shows name", homeText.includes("TestFox"));
  check("demo mode flagged", homeText.includes("DEMO MODE"));
  check("stat tiles present", await page.locator(".stat").count() === 3);
  check("hero CTA = review (4 starter cards due)", homeText.includes("Review 4 cards"));
  check("7-day chart bars", await page.locator(".chart7 .col").count() === 7);
  check("badges rendered", await page.locator(".badge-tile").count() === 7);
  check("review nav badge shows 4", (await page.locator("#navreview .badge").innerText()) === "4");
  await page.screenshot({ path: SHOTS + "/02-home.png" });

  /* ---------- quiz (demo) ---------- */
  await page.click('nav.tabs button[data-v="quiz"]');
  await page.waitForSelector("#view-quiz.active");
  await page.fill("#quiz-topic", "how the internet works");
  await page.click("#quiz-start");
  await page.waitForSelector(".q-option", { timeout: 5000 });
  check("quiz generated (demo)", (await page.locator("#view-quiz").innerText()).includes("How the Internet Works"));
  await page.screenshot({ path: SHOTS + "/03-quiz.png" });
  // answer all 5: pick option index 0 every time (some right, some wrong)
  for (let i = 0; i < 5; i++) {
    await page.click('.q-option[data-j="0"]');
    await page.waitForSelector(".explain");
    check(`q${i + 1} explanation shown`, (await page.locator(".explain").innerText()).length > 10);
    await page.click("#q-continue");
  }
  await page.waitForSelector("#quiz-again");
  const resTxt = await page.locator("#view-quiz").innerText();
  check("quiz results screen", /correct/.test(resTxt));
  const missBtn = page.locator("#save-misses");
  if (await missBtn.count()) {
    await missBtn.click();
    check("misses saved to deck", (await missBtn.innerText()).includes("Added"));
  } else {
    check("perfect score path", true, "no misses to save");
  }
  await page.screenshot({ path: SHOTS + "/04-quiz-results.png" });

  /* ---------- review ---------- */
  await page.click('nav.tabs button[data-v="review"]');
  await page.waitForSelector("#view-review.active .flashcard");
  check("review session starts", true);
  await page.screenshot({ path: SHOTS + "/05-review-front.png" });
  // flip via click, grade via keyboard, then loop the rest with Good
  await page.click("#fc");
  await page.waitForSelector(".grade-row");
  check("card flips & grade buttons appear", true);
  await page.screenshot({ path: SHOTS + "/06-review-back.png" });
  for (let guard = 0; guard < 20; guard++) {
    if (!(await page.locator(".grade-row").count())) {
      if (!(await page.locator(".flashcard").count())) break; // session done
      await page.keyboard.press("Space");
      await page.waitForTimeout(80);
    }
    if (await page.locator(".grade-row").count()) {
      await page.keyboard.press("3"); // Good
      await page.waitForTimeout(120);
    }
  }
  check("review session completes", (await page.locator("#view-review").innerText()).includes("Session complete"));
  await page.screenshot({ path: SHOTS + "/07-review-done.png" });

  /* ---------- tutor (demo) ---------- */
  await page.click('nav.tabs button[data-v="tutor"]');
  await page.waitForSelector("#view-tutor.active");
  check("tutor greeting seeded", (await page.locator(".msg.bot").count()) >= 1);
  await page.fill("#chat-in", "Why is the sky blue?");
  await page.click("#chat-send");
  await page.waitForTimeout(900);
  const chatTxt = await page.locator("#chatlog").innerText();
  check("demo tutor reply", chatTxt.includes("Demo mode"));
  check("user message rendered", chatTxt.includes("Why is the sky blue?"));
  await page.screenshot({ path: SHOTS + "/08-tutor.png" });

  /* ---------- paths (demo) ---------- */
  await page.click('nav.tabs button[data-v="paths"]');
  await page.waitForSelector("#view-paths.active");
  await page.fill("#path-goal", "Play chess better");
  await page.click("#path-make");
  await page.waitForSelector(".milestone", { timeout: 5000 });
  check("demo path created", (await page.locator(".milestone").count()) === 4);
  await page.click('.m-check');
  await page.waitForTimeout(200);
  check("milestone toggles + XP", (await page.locator(".m-check.done").count()) >= 1);
  await page.screenshot({ path: SHOTS + "/09-paths.png" });

  /* ---------- settings ---------- */
  await page.click('.iconbtn[title="Settings"]');
  await page.waitForSelector("#view-settings.active");
  check("settings renders", (await page.locator("#view-settings").innerText()).includes("Tutor connection"));
  await page.selectOption("#set-aud", "expert");
  check("audience change ok", true);
  await page.screenshot({ path: SHOTS + "/10-settings.png" });

  /* ---------- home after activity ---------- */
  await page.click('nav.tabs button[data-v="home"]');
  await page.waitForTimeout(200);
  const home2 = await page.locator("#view-home").innerText();
  check("XP accumulated on dashboard", !home2.includes("⚡ 0"));
  check("streak = 1", (await page.locator("#pill-streak").innerText()).includes("1"));
  await page.screenshot({ path: SHOTS + "/11-home-after.png" });

  /* ---------- persistence across reload ---------- */
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#view-home.active", { timeout: 5000 });
  check("state persists across reload", (await page.locator("#view-home").innerText()).includes("TestFox"));

  /* ---------- desktop viewport sanity ---------- */
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + "/12-desktop.png" });
  check("desktop viewport renders", true);

} catch (e) {
  check("FATAL", false, e.message);
  await page.screenshot({ path: SHOTS + "/99-fatal.png" }).catch(() => {});
}

if (errors.length) { console.log("\nJS ERRORS:"); errors.forEach(e => console.log("  •", e)); }
const fails = results.filter(r => !r.ok).length;
console.log(`\n${results.length - fails}/${results.length} checks passed, ${errors.length} JS errors`);
await browser.close();
process.exit(fails || errors.length ? 1 : 0);
