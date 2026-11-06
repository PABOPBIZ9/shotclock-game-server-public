import type { Card, Deck } from "./decks";

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface Question {
  id: string;
  cardId: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
}

/** Build multiple-choice questions; wrong answers come from other cards in the deck. */
export function buildQuestions(deck: Deck, count: number, seed: number): Question[] {
  const rand = rng(seed);
  const cards = deck.cards;
  if (cards.length < 4) throw new Error("Deck needs at least 4 cards");
  const order: Card[] = [];
  while (order.length < count) order.push(...shuffle(cards, rand));
  return order.slice(0, count).map((card, i) => {
    const distractors = shuffle(
      cards.filter((c) => c.id !== card.id && c.back !== card.back),
      rand,
    ).slice(0, 3);
    const choices = shuffle([card, ...distractors], rand);
    return {
      id: `q${i + 1}`,
      cardId: card.id,
      prompt: card.front,
      choices: choices.map((c) => c.back),
      answerIndex: choices.findIndex((c) => c.id === card.id),
    };
  });
}

export const BASE_POINTS = 100;
export const MAX_SPEED_BONUS = 100;

/** Points for an answer: base + speed bonus, multiplied by streak (max x1.5). */
export function scoreAnswer(opts: { correct: boolean; msLeft: number; msTotal: number; streak: number }) {
  if (!opts.correct) return 0;
  const frac = Math.max(0, Math.min(1, opts.msLeft / Math.max(1, opts.msTotal)));
  const speed = Math.round(MAX_SPEED_BONUS * frac);
  const mult = 1 + Math.min(opts.streak, 5) * 0.1;
  return Math.round((BASE_POINTS + speed) * mult);
}

export interface Rank {
  name: string;
  min: number;
  emoji: string;
}

export const RANKS: Rank[] = [
  { name: "Hatchling", min: 0, emoji: "🥚" },
  { name: "Scholar", min: 1000, emoji: "📘" },
  { name: "Jade", min: 3000, emoji: "🟢" },
  { name: "Gold", min: 6000, emoji: "🥇" },
  { name: "Dragon", min: 12000, emoji: "🐉" },
  { name: "Grand Dragon", min: 25000, emoji: "👑" },
];

export function rankFor(points: number) {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (points >= r.min) idx = i;
  });
  const next = RANKS[idx + 1];
  const cur = RANKS[idx];
  const progress = next ? (points - cur.min) / (next.min - cur.min) : 1;
  return { rank: cur, next, progress: Math.max(0, Math.min(1, progress)) };
}

/** Countdown warning level used by exam + quiz timers. */
export function timerLevel(secondsLeft: number, totalSeconds: number): "ok" | "warn" | "danger" {
  if (secondsLeft <= Math.min(10, totalSeconds * 0.1)) return "danger";
  if (secondsLeft <= totalSeconds * 0.25) return "warn";
  return "ok";
}

/* ---------- Clock Rating (QB-rating style) ---------- */
export const RATING_MAX = 158.3;
export const ACCURACY_WEIGHT = 0.7;
export const SPEED_WEIGHT = 0.3;
export const GRADES = [
  { min: 92, letter: "S", title: "Hall of Fame" },
  { min: 82, letter: "A", title: "All-Pro" },
  { min: 70, letter: "B", title: "Starter" },
  { min: 55, letter: "C", title: "Rotation" },
  { min: 40, letter: "D", title: "Rookie" },
  { min: 0, letter: "F", title: "Film study" },
] as const;

/**
 * Accuracy (share correct) and speed (avg share of the clock left on correct answers)
 * combine 70/30 into a 0–100 composite, shown as a 0–158.3 Clock Rating and a letter grade.
 */
export function clockRating(o: { correct: number; answered: number; avgTimeLeftFrac: number }) {
  const accuracy = o.answered ? o.correct / o.answered : 0;
  const speed = Math.max(0, Math.min(1, o.avgTimeLeftFrac));
  const composite = Math.round((accuracy * ACCURACY_WEIGHT + speed * SPEED_WEIGHT) * 1000) / 10;
  const rating = Math.round((composite / 100) * RATING_MAX * 10) / 10;
  const grade = GRADES.find((g) => composite >= g.min) ?? GRADES[GRADES.length - 1];
  return { accuracy: Math.round(accuracy * 100), speed: Math.round(speed * 100), composite, rating, grade };
}
