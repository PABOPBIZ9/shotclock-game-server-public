/**
 * Server-authoritative timed quiz match engine.
 * Pure and time-injected: runs identically in a Socket.io server or in the
 * browser (practice mode vs bots).
 */
import type { Deck } from "./decks";
import { buildQuestions, rng, scoreAnswer, type Question } from "./quiz";

export type Format = "headsup" | "sng" | "tournament";
/** Chess-style clocks. v0.01 beta defaults lean generous (Classic/Slow/Regular). */
export type Speed = "classic" | "slow" | "regular" | "turbo" | "hyper";

export const SPEEDS: Record<Speed, { label: string; seconds: number; blurb: string }> = {
  classic: { label: "Classic", seconds: 45, blurb: "Beginner pace. Read, think, answer." },
  slow: { label: "Slow", seconds: 30, blurb: "Relaxed clock while you learn the deck." },
  regular: { label: "Regular", seconds: 20, blurb: "Default beta speed." },
  turbo: { label: "Turbo", seconds: 12, blurb: "For players who know the deck." },
  hyper: { label: "Hyper", seconds: 7, blurb: "Pure reflex. Experts only." },
};
export const SPEED_ORDER: Speed[] = ["classic", "slow", "regular", "turbo", "hyper"];
export const DEFAULT_SPEED: Speed = "regular";

export interface FormatDef {
  label: string;
  min: number;
  max: number;
}

/** Capped table sizes (heads-up = 2). Multi-table tournaments are uncapped. */
export const TABLE_SIZES = [2, 3, 6, 8, 9, 45, 90, 180] as const;
export const SNG_SIZES = [3, 6, 8, 9, 45, 90, 180] as const;
export const MTT_MAX = 100_000;

export const FORMATS: Record<Format, FormatDef> = {
  headsup: { label: "Heads-Up", min: 2, max: 2 },
  sng: { label: "Sit & Go", min: 3, max: 180 },
  tournament: { label: "Tournament", min: 2, max: MTT_MAX },
};

/**
 * Questions per stage for a given field size. After every non-final stage
 * the bottom half is eliminated (never below 2 players).
 */
export function stagesFor(format: Format, players: number): number[] {
  if (format === "headsup") return [10];
  if (players <= 9) return [12];
  if (players <= 45) return [5, 5, 6];
  if (players <= 180) return [5, 5, 5, 6];
  return [4, 4, 4, 4, 4, 6];
}

/**
 * "points": base + speed bonus with streak multiplier (casual/free play).
 * "skill": pure skill ranking for paid tables — most correct answers first,
 *   then lowest total answer time (ms; unanswered/wrong counts as the full
 *   timer). Players equal on both are tied and share prizes equally.
 *   No sudden death, no randomness in scoring.
 */
export type RankBy = "points" | "skill";

export const REVEAL_MS = 900;

export interface MatchPlayer {
  id: string;
  name: string;
  avatar: string;
  bot?: boolean;
  score: number;
  streak: number;
  correct: number;
  eliminated: boolean;
  eliminatedAt?: number; // question index when eliminated
  connected: boolean;
  /** Sum of ms used per question (unanswered or wrong = full timer). */
  timeMs: number;
}

export interface AnswerRecord {
  choice: number;
  at: number;
}

export type Phase = "waiting" | "question" | "reveal" | "finished";

export interface MatchSnapshot {
  id: string;
  format: Format;
  speed: Speed;
  deckId: string;
  phase: Phase;
  qIndex: number;
  qTotal: number;
  stage: number;
  question?: Omit<Question, "answerIndex"> & { answerIndex?: number };
  deadline?: number;
  secondsPerQ: number;
  players: (MatchPlayer & { answered: boolean; lastChoice?: number; lastGain?: number })[];
  standings?: string[];
  /** Standings grouped by ties (skill mode). */
  rankGroups?: string[][];
  rankBy: RankBy;
  regulation: number;
  stageCount: number;
  maxPlayers: number;
}

export class Match {
  readonly id: string;
  readonly format: Format;
  readonly speed: Speed;
  readonly deck: Deck;
  readonly questions: Question[];
  stageEnds: number[] = [];
  stages: number[] = [];
  readonly rankBy: RankBy;
  players: MatchPlayer[] = [];
  phase: Phase = "waiting";
  qIndex = -1;
  deadline = 0;
  revealUntil = 0;
  answers = new Map<string, AnswerRecord>();
  lastGains = new Map<string, number>();
  lastChoices = new Map<string, number>();
  suddenDeath = 0;
  private seed: number;

  constructor(opts: { id: string; format: Format; speed: Speed; deck: Deck; seed: number; rankBy?: RankBy; maxPlayers?: number }) {
    this.id = opts.id;
    this.format = opts.format;
    this.speed = opts.speed;
    this.deck = opts.deck;
    this.seed = opts.seed;
    this.rankBy = opts.rankBy ?? "points";
    this.maxPlayers = Math.min(opts.maxPlayers ?? FORMATS[opts.format].max, FORMATS[opts.format].max);
    // One shared question list: every player gets identical questions in identical order.
    // 30 = longest stage plan (26) + reserve for sudden-death tiebreaks.
    this.questions = buildQuestions(opts.deck, 31, opts.seed);
  }

  readonly maxPlayers: number;

  get secondsPerQ() {
    return SPEEDS[this.speed].seconds;
  }

  get def() {
    return FORMATS[this.format];
  }

  get regulationTotal() {
    return this.stages.reduce((a, b) => a + b, 0);
  }

  active() {
    return this.players.filter((p) => !p.eliminated);
  }

  addPlayer(p: { id: string; name: string; avatar: string; bot?: boolean }) {
    if (this.phase !== "waiting") throw new Error("Match already started");
    if (this.players.length >= this.maxPlayers) throw new Error("Table is full");
    if (this.players.some((x) => x.id === p.id)) return;
    this.players.push({ ...p, score: 0, streak: 0, correct: 0, eliminated: false, connected: true, timeMs: 0 });
  }

  canStart() {
    return this.phase === "waiting" && this.players.length >= this.def.min;
  }

  start(now: number) {
    if (!this.canStart()) throw new Error("Not enough players");
    this.stages = stagesFor(this.format, this.players.length);
    let acc = 0;
    this.stageEnds = this.stages.map((s) => (acc += s) - 1);
    this.nextQuestion(now);
  }

  private nextQuestion(now: number) {
    this.qIndex += 1;
    this.answers.clear();
    this.phase = "question";
    this.deadline = now + this.secondsPerQ * 1000;
  }

  hasAnswered(playerId: string) {
    return this.answers.has(playerId);
  }

  answer(playerId: string, choice: number, now: number): boolean {
    if (this.phase !== "question") return false;
    const p = this.players.find((x) => x.id === playerId);
    if (!p || p.eliminated) return false;
    if (this.answers.has(playerId)) return false;
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) return false;
    if (now > this.deadline) return false;
    this.answers.set(playerId, { choice, at: now });
    return true;
  }

  /** Advance the state machine. Returns true when state changed. */
  tick(now: number): boolean {
    if (this.phase === "question") {
      const everyone = this.active().every((p) => this.answers.has(p.id) || !p.connected);
      if (now >= this.deadline || everyone) {
        this.resolve(now);
        return true;
      }
    } else if (this.phase === "reveal" && now >= this.revealUntil) {
      if (this.isOver()) {
        this.phase = "finished";
      } else {
        this.nextQuestion(now);
      }
      return true;
    }
    return false;
  }

  /** Practice/UI: shrink remaining reveal so next question arrives ASAP. */
  hurryReveal(now: number, ms = 600) {
    if (this.phase === "reveal") this.revealUntil = Math.min(this.revealUntil, now + ms);
  }

  private resolve(now: number) {
    const q = this.questions[this.qIndex];
    const total = this.secondsPerQ * 1000;
    this.lastGains.clear();
    this.lastChoices.clear();
    for (const p of this.active()) {
      const a = this.answers.get(p.id);
      const correct = !!a && a.choice === q.answerIndex;
      if (a) this.lastChoices.set(p.id, a.choice);
      const gain = scoreAnswer({
        correct,
        msLeft: a ? this.deadline - a.at : 0,
        msTotal: total,
        streak: p.streak,
      });
      p.score += gain;
      p.timeMs += correct && a ? Math.max(0, Math.min(total, a.at - (this.deadline - total))) : total;
      p.streak = correct ? p.streak + 1 : 0;
      if (correct) p.correct += 1;
      this.lastGains.set(p.id, gain);
    }
    // tournament elimination at end of each non-final stage
    const stageIdx = this.stageEnds.indexOf(this.qIndex);
    if (stageIdx >= 0 && stageIdx < this.stageEnds.length - 1) {
      const alive = this.sorted(this.active());
      const keep = Math.max(2, Math.ceil(alive.length / 2));
      alive.slice(keep).forEach((p) => {
        p.eliminated = true;
        p.eliminatedAt = this.qIndex;
      });
    }
    this.phase = "reveal";
    this.revealUntil = now + REVEAL_MS;
  }

  /** Comparison used for ranking; 0 means a genuine tie. */
  compare(a: MatchPlayer, b: MatchPlayer) {
    if (this.rankBy === "skill") return b.correct - a.correct || a.timeMs - b.timeMs;
    return b.score - a.score || b.correct - a.correct;
  }

  private sorted(list: MatchPlayer[]) {
    return list.slice().sort((a, b) => this.compare(a, b) || a.id.localeCompare(b.id));
  }

  private isOver() {
    if (this.active().length <= 1) return true;
    if (this.qIndex + 1 < this.regulationTotal) return false;
    // Tie at the top -> sudden death (max 5 extra questions)
    if (this.rankBy === "skill") return true; // ties are shared, never broken by extra questions
    const top = this.sorted(this.active());
    const tied = top.length > 1 && this.compare(top[0], top[1]) === 0;
    if (tied && this.suddenDeath < 5 && this.qIndex + 1 < this.questions.length) {
      this.suddenDeath += 1;
      return false;
    }
    return true;
  }

  standings(): string[] {
    const alive = this.sorted(this.active());
    const out = this.players
      .filter((p) => p.eliminated)
      .sort((a, b) => (b.eliminatedAt ?? 0) - (a.eliminatedAt ?? 0) || this.compare(a, b) || a.id.localeCompare(b.id));
    return [...alive, ...out].map((p) => p.id);
  }

  /** Standings grouped into ties (players equal under compare()). */
  rankGroups(): string[][] {
    const order = this.standings().map((id) => this.players.find((p) => p.id === id)!);
    const groups: MatchPlayer[][] = [];
    for (const p of order) {
      const g = groups[groups.length - 1];
      if (g && !g[0].eliminated && !p.eliminated && this.compare(g[0], p) === 0) g.push(p);
      else if (g && g[0].eliminated && p.eliminated && g[0].eliminatedAt === p.eliminatedAt && this.compare(g[0], p) === 0) g.push(p);
      else groups.push([p]);
    }
    return groups.map((g) => g.map((p) => p.id));
  }

  stage() {
    const i = this.stageEnds.findIndex((end) => this.qIndex <= end);
    return i < 0 ? this.stageEnds.length : i + 1;
  }

  setConnected(id: string, connected: boolean) {
    const p = this.players.find((x) => x.id === id);
    if (p) p.connected = connected;
  }

  snapshot(): MatchSnapshot {
    const q = this.questions[this.qIndex];
    const reveal = this.phase === "reveal" || this.phase === "finished";
    return {
      id: this.id,
      format: this.format,
      speed: this.speed,
      deckId: this.deck.id,
      phase: this.phase,
      qIndex: this.qIndex,
      qTotal: this.regulationTotal + this.suddenDeath,
      stage: this.stage(),
      question: q
        ? { id: q.id, cardId: q.cardId, prompt: q.prompt, choices: q.choices, ...(reveal ? { answerIndex: q.answerIndex } : {}) }
        : undefined,
      deadline: this.phase === "question" ? this.deadline : undefined,
      secondsPerQ: this.secondsPerQ,
      players: this.players.map((p) => ({
        ...p,
        answered: this.answers.has(p.id),
        lastChoice: reveal ? this.lastChoices.get(p.id) : undefined,
        lastGain: reveal ? this.lastGains.get(p.id) : undefined,
      })),
      standings: this.phase === "finished" ? this.standings() : undefined,
      rankGroups: this.phase === "finished" ? this.rankGroups() : undefined,
      rankBy: this.rankBy,
      regulation: this.regulationTotal,
      stageCount: this.stages.length,
      maxPlayers: this.maxPlayers,
    };
  }

  /** Deterministic bot behaviour so practice games feel human. */
  botPlan(botId: string, skill: number): { delayMs: number; choice: number } {
    const q = this.questions[this.qIndex];
    const r = rng(this.seed ^ (this.qIndex * 7919) ^ hash(botId));
    const correct = r() < skill;
    const wrong = [0, 1, 2, 3].filter((i) => i !== q.answerIndex);
    const choice = correct ? q.answerIndex : wrong[Math.floor(r() * wrong.length)];
    // Cap so a full table doesn't sit ~30s after the human already locked in.
    const total = this.secondsPerQ * 1000;
    const delayMs = Math.min(4_500, Math.round(total * (0.12 + r() * 0.35)));
    return { delayMs, choice };
  }
}

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const BOT_NAMES = [
  "Panda Prof", "Quiz Koi", "Jade Fox", "Lucky Tiger", "Ink Crane", "Neon Ox",
  "Pixel Monk", "Turbo Owl", "Lotus Byte", "Comet Cat", "Dumpling", "Red Kite",
];
export const AVATARS = ["🐼", "🐟", "🦊", "🐯", "🦢", "🐂", "🧘", "🦉", "🪷", "🐱", "🥟", "🪁", "🐉", "🐸", "🦄", "🐙"];
