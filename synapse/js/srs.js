/* Spaced repetition scheduling — SM-2 variant.
   grade: 0 = Again, 1 = Hard, 2 = Good, 3 = Easy */

import { todayISO } from "./ui.js";

export function gradeCard(card, grade) {
  const q = [1, 3, 4, 5][grade]; // map to SM-2 quality 0-5 scale
  if (q < 3) {
    card.reps = 0;
    card.interval = 0;
    card.lapses++;
    card.due = todayISO(); // resurfaces this session
  } else {
    if (card.reps === 0) card.interval = 1;
    else if (card.reps === 1) card.interval = grade === 3 ? 4 : 3;
    else card.interval = Math.round(card.interval * card.ease * (grade === 1 ? 0.8 : grade === 3 ? 1.3 : 1));
    card.reps++;
    card.ease = Math.max(1.3, card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    const d = new Date();
    d.setDate(d.getDate() + card.interval);
    card.due = d.toISOString().slice(0, 10);
  }
}

export function dueCards(user) {
  const t = todayISO();
  return user.cards.filter(c => c.due <= t);
}

/* What would this grade schedule the card to? (for button hints) */
export function intervalPreview(card, grade) {
  const c = { ...card };
  gradeCard(c, grade);
  return c.interval <= 0 ? "today" : c.interval === 1 ? "1 day" : c.interval + " days";
}
