/* App state: persistence, user model, XP / levels, streaks, badges.
   Everything lives in localStorage — no server, data never leaves the device
   (except messages sent to the Anthropic API when a key is configured). */

import { uid, todayISO, daysBetween, toast, burst } from "./ui.js";
import { refreshHeader } from "./shell.js";

const STORE_KEY = "synapse.v1";

export let S = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted store -> start fresh */ }
  return { users: [], activeUserId: null, settings: { apiKey: "", model: "claude-opus-4-8" } };
}

export function save() { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
export function replaceState(next) { S = next; save(); }
export function resetAll() { localStorage.removeItem(STORE_KEY); }

export function me() { return S.users.find(u => u.id === S.activeUserId) || null; }
export function hasKey() { return !!(S.settings.apiKey && S.settings.apiKey.trim()); }

export const AUDIENCES = {
  kid:    { label: "Kid (6–11)",     prompt: "a curious child aged 6-11. Use simple words, short sentences, vivid everyday analogies, and playful energy. Avoid jargon entirely." },
  teen:   { label: "Teen (12–17)",   prompt: "a teenager. Be relatable and clear, define new terms when you introduce them, and connect ideas to things teens encounter." },
  adult:  { label: "Adult",          prompt: "a motivated adult learner. Be clear and substantive; introduce technical terms with brief definitions." },
  expert: { label: "Deep technical", prompt: "a technically sophisticated learner who wants full depth. Use precise terminology, real equations/mechanisms where relevant, and don't oversimplify." },
};

export function newUser(name, emoji, audience, goals, interests) {
  return {
    id: uid(), name, emoji, audience, goals, interests,
    createdAt: todayISO(),
    xp: 0, level: 1,
    streak: { current: 0, best: 0, lastDay: null, freezes: 1 },
    activity: {},                    // { "2026-07-05": xpEarnedThatDay }
    cards: starterCards(),
    paths: [],
    chat: [],
    badges: [],
    stats: { quizzes: 0, quizCorrect: 0, quizTotal: 0, reviews: 0, messages: 0, topicsQuizzed: {} },
  };
}

function starterCards() {
  const mk = (front, back) => ({
    id: uid(), front, back, topic: "Learning science",
    ease: 2.5, interval: 0, reps: 0, due: todayISO(), lapses: 0, sample: true,
  });
  return [
    mk("What is the 'spacing effect'?", "We remember far better when practice is spread out over time instead of crammed — each spaced recall strengthens the memory."),
    mk("Why does testing yourself beat re-reading?", "Retrieval practice: pulling a memory out strengthens it. Re-reading only creates a feeling of familiarity, not durable recall."),
    mk("What makes a fact easier to remember long-term?", "Association — linking it to things you already know (stories, images, analogies). Memory is a web, not a filing cabinet."),
    mk("What does 'first principles' thinking mean?", "Breaking a topic down to its most basic truths and reasoning up from there, instead of memorizing conclusions."),
  ];
}

/* ---------------- XP & levels ---------------- */
const LEVEL_STEP = 150; // xp needed to clear level n = n * LEVEL_STEP

export function totalXpForLevel(lvl) { // cumulative xp needed to *reach* lvl
  let t = 0;
  for (let i = 1; i < lvl; i++) t += i * LEVEL_STEP;
  return t;
}

export function addXP(n, why) {
  const u = me();
  if (!u) return;
  u.xp += n;
  const day = todayISO();
  u.activity[day] = (u.activity[day] || 0) + n;
  touchStreak(u);
  let leveled = false;
  while (u.xp >= totalXpForLevel(u.level + 1)) { u.level++; leveled = true; }
  save();
  refreshHeader();
  toast(`+${n} XP · ${why}`, "xp");
  if (leveled) {
    burst("🌟", 8);
    toast(`Level up! You're now level <b>${u.level}</b> 🎉`, "xp");
  }
  checkBadges(u);
}

/* ---------------- streaks (with freezes as forgiveness) ---------------- */
export function touchStreak(u) {
  const day = todayISO();
  if (u.streak.lastDay === day) return;
  if (!u.streak.lastDay) {
    u.streak.current = 1;
  } else {
    const gap = daysBetween(u.streak.lastDay, day);
    if (gap === 1) u.streak.current++;
    else if (gap > 1) {
      const misses = gap - 1;
      if (misses <= u.streak.freezes) {
        u.streak.freezes -= misses;
        u.streak.current++;
        toast("🧊 Streak freeze used — streak saved!");
      } else {
        u.streak.current = 1;
      }
    }
  }
  u.streak.lastDay = day;
  if (u.streak.current > (u.streak.best || 0)) u.streak.best = u.streak.current;
  // earn a freeze every 7 consecutive days (cap 3)
  if (u.streak.current > 0 && u.streak.current % 7 === 0 && u.streak.freezes < 3) {
    u.streak.freezes++;
    toast("🧊 You earned a streak freeze!");
  }
}

/* ---------------- badges ---------------- */
export const BADGES = [
  { id: "spark",    e: "✨", n: "First Spark",   test: u => u.xp > 0 },
  { id: "streak7",  e: "🔥", n: "7-Day Streak",  test: u => u.streak.best >= 7 },
  { id: "streak30", e: "🌋", n: "30-Day Streak", test: u => u.streak.best >= 30 },
  { id: "quiz10",   e: "🎯", n: "Quiz Whiz",     test: u => u.stats.quizzes >= 10 },
  { id: "rev100",   e: "🧠", n: "Memory Master", test: u => u.stats.reviews >= 100 },
  { id: "path1",    e: "🏔️", n: "Pathfinder",    test: u => u.paths.some(p => p.milestones.length && p.milestones.every(m => m.done)) },
  { id: "curious",  e: "🔭", n: "Deep Diver",    test: u => u.stats.messages >= 25 },
];

export function checkBadges(u) {
  for (const b of BADGES) {
    if (!u.badges.includes(b.id) && b.test(u)) {
      u.badges.push(b.id);
      save();
      burst(b.e, 7);
      toast(`Badge unlocked: ${b.e} <b>${b.n}</b>`);
    }
  }
}
