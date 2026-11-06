import type { Speed } from "./match";
import type { TierId } from "./config";
import type { StakeId } from "./stakes";

/** Soft-launch Bomb Pops event nicknames (3 per stake level). */
export const BOMB_POPS_EVENT_NAMES = ["First Freeze", "Rocket Rush", "Final Melt"] as const;
export type BombPopsEventName = (typeof BOMB_POPS_EVENT_NAMES)[number];

export interface ScheduledEvent {
  id: string;
  name: string;
  /** Deck id, or "rotate" to cycle through the built-in courses. */
  deckId: string;
  speed: Speed;
  tier: TierId;
  /** Repeat every N minutes (aligned to the epoch), or weekly at a UTC day/hour. */
  everyMin?: number;
  weekly?: { dow: number; hourUtc: number };
  lateRegMin: number;
  premiumOnly?: boolean;
  prize: string;
  /** Practice field size used when no game server is connected. */
  practiceField: number;
  /** Stake level; defaults to freeroll. */
  stake?: StakeId;
  featured?: boolean;
  /**
   * live = has a real server schedule (everyMin / weekly).
   * draft = named config ready; not inventing a public start time.
   */
  lineup?: "live" | "draft";
  /** Bomb Pops nickname for filtering / soft-table labels. */
  bombPopsName?: BombPopsEventName;
}

export function bombPopsDisplayName(nick: BombPopsEventName, stakeLabel: string): string {
  return `Bomb Pops ${nick} · ${stakeLabel}`;
}

const FREE_PRIZE = "5,000 pts + Rocket badge";
const PAID_PRIZE = "Est. if full · grows with entries · 88.88% to players";

/**
 * Bomb Pops Series — one topic/course, 3 named events × 4 stake levels.
 * Stable legacy IDs (pops-open / pops-micro / pops-mid / pops-whale) = First Freeze.
 * Rocket Rush + Final Melt are draft configs until a real schedule is chosen.
 */
export const BOMB_POPS_SERIES: ScheduledEvent[] = [
  // —— First Freeze (legacy IDs preserved) ——
  {
    id: "pops-open",
    name: bombPopsDisplayName("First Freeze", "Freeroll"),
    bombPopsName: "First Freeze",
    deckId: "bomb-pops",
    speed: "regular",
    tier: "free",
    everyMin: 30,
    lateRegMin: 8,
    stake: "free",
    featured: true,
    lineup: "live",
    prize: FREE_PRIZE,
    practiceField: 180,
  },
  {
    id: "pops-micro",
    name: bombPopsDisplayName("First Freeze", "Micro"),
    bombPopsName: "First Freeze",
    deckId: "bomb-pops",
    speed: "turbo",
    tier: "free",
    weekly: { dow: 2, hourUtc: 19 },
    lateRegMin: 90,
    stake: "micro",
    featured: true,
    lineup: "live",
    prize: PAID_PRIZE,
    practiceField: 90,
  },
  {
    id: "pops-mid",
    name: bombPopsDisplayName("First Freeze", "Mid"),
    bombPopsName: "First Freeze",
    deckId: "bomb-pops",
    speed: "regular",
    tier: "free",
    weekly: { dow: 4, hourUtc: 20 },
    lateRegMin: 90,
    stake: "mid",
    featured: true,
    lineup: "live",
    prize: PAID_PRIZE,
    practiceField: 60,
  },
  {
    id: "pops-whale",
    name: bombPopsDisplayName("First Freeze", "Whale"),
    bombPopsName: "First Freeze",
    deckId: "bomb-pops",
    speed: "turbo",
    tier: "free",
    weekly: { dow: 6, hourUtc: 21 },
    lateRegMin: 60,
    stake: "whale",
    featured: true,
    lineup: "live",
    prize: PAID_PRIZE,
    practiceField: 36,
  },
  // —— Rocket Rush (draft / fill-to-start configs) ——
  {
    id: "pops-rocket-rush-free",
    name: bombPopsDisplayName("Rocket Rush", "Freeroll"),
    bombPopsName: "Rocket Rush",
    deckId: "bomb-pops",
    speed: "turbo",
    tier: "free",
    lateRegMin: 8,
    stake: "free",
    lineup: "draft",
    prize: FREE_PRIZE,
    practiceField: 90,
  },
  {
    id: "pops-rocket-rush-micro",
    name: bombPopsDisplayName("Rocket Rush", "Micro"),
    bombPopsName: "Rocket Rush",
    deckId: "bomb-pops",
    speed: "turbo",
    tier: "free",
    lateRegMin: 45,
    stake: "micro",
    lineup: "draft",
    prize: PAID_PRIZE,
    practiceField: 45,
  },
  {
    id: "pops-rocket-rush-mid",
    name: bombPopsDisplayName("Rocket Rush", "Mid"),
    bombPopsName: "Rocket Rush",
    deckId: "bomb-pops",
    speed: "regular",
    tier: "free",
    lateRegMin: 45,
    stake: "mid",
    lineup: "draft",
    prize: PAID_PRIZE,
    practiceField: 36,
  },
  {
    id: "pops-rocket-rush-whale",
    name: bombPopsDisplayName("Rocket Rush", "Whale"),
    bombPopsName: "Rocket Rush",
    deckId: "bomb-pops",
    speed: "turbo",
    tier: "free",
    lateRegMin: 30,
    stake: "whale",
    lineup: "draft",
    prize: PAID_PRIZE,
    practiceField: 18,
  },
  // —— Final Melt (draft) ——
  {
    id: "pops-final-melt-free",
    name: bombPopsDisplayName("Final Melt", "Freeroll"),
    bombPopsName: "Final Melt",
    deckId: "bomb-pops",
    speed: "regular",
    tier: "free",
    lateRegMin: 8,
    stake: "free",
    lineup: "draft",
    prize: FREE_PRIZE,
    practiceField: 120,
  },
  {
    id: "pops-final-melt-micro",
    name: bombPopsDisplayName("Final Melt", "Micro"),
    bombPopsName: "Final Melt",
    deckId: "bomb-pops",
    speed: "regular",
    tier: "free",
    lateRegMin: 45,
    stake: "micro",
    lineup: "draft",
    prize: PAID_PRIZE,
    practiceField: 60,
  },
  {
    id: "pops-final-melt-mid",
    name: bombPopsDisplayName("Final Melt", "Mid"),
    bombPopsName: "Final Melt",
    deckId: "bomb-pops",
    speed: "turbo",
    tier: "free",
    lateRegMin: 45,
    stake: "mid",
    lineup: "draft",
    prize: PAID_PRIZE,
    practiceField: 45,
  },
  {
    id: "pops-final-melt-whale",
    name: bombPopsDisplayName("Final Melt", "Whale"),
    bombPopsName: "Final Melt",
    deckId: "bomb-pops",
    speed: "regular",
    tier: "free",
    lateRegMin: 30,
    stake: "whale",
    lineup: "draft",
    prize: PAID_PRIZE,
    practiceField: 27,
  },
];

/** Stake ids that appear in the Bomb Pops Series ladder (exactly four). */
export const BOMB_POPS_STAKE_IDS: readonly StakeId[] = ["free", "micro", "mid", "whale"];

export const SCHEDULE: ScheduledEvent[] = [
  ...BOMB_POPS_SERIES,
  { id: "sunday-warmup", name: "Sunday Warm-Up", deckId: "rotate", speed: "regular", tier: "free", weekly: { dow: 0, hourUtc: 18 }, lateRegMin: 30, prize: "350 FPP + Gold badge", practiceField: 120, lineup: "live" },
  { id: "daily-big-brain", name: "Daily Big Brain", deckId: "rotate", speed: "regular", tier: "free", everyMin: 1440, lateRegMin: 30, prize: "150 FPP", practiceField: 90, lineup: "live" },
  { id: "premium-freeroll", name: "Premium Freeroll", deckId: "rotate", speed: "turbo", tier: "free", everyMin: 1440, lateRegMin: 20, premiumOnly: true, prize: "Cosmetic card back + 100 FPP", practiceField: 40, lineup: "live" },
];

export function isScheduledLive(ev: ScheduledEvent): boolean {
  return ev.lineup !== "draft" && (!!ev.everyMin || !!ev.weekly);
}

export function nextStart(ev: ScheduledEvent, now: number): number {
  if (ev.everyMin) {
    const p = ev.everyMin * 60_000;
    return Math.ceil(now / p) * p;
  }
  if (!ev.weekly) return Number.POSITIVE_INFINITY;
  const w = ev.weekly;
  const d = new Date(now);
  const day = d.getUTCDay();
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), w.hourUtc);
  let add = (w.dow - day + 7) % 7;
  if (add === 0 && t <= now) add = 7;
  return t + add * 86_400_000;
}

/** Most recent start, used to decide whether late registration is open. */
export function lastStart(ev: ScheduledEvent, now: number): number {
  if (ev.everyMin) {
    const p = ev.everyMin * 60_000;
    return Math.floor(now / p) * p;
  }
  if (!ev.weekly) return 0;
  return nextStart(ev, now) - 7 * 86_400_000;
}

export function lateRegOpen(ev: ScheduledEvent, now: number) {
  if (!isScheduledLive(ev)) return false;
  return now - lastStart(ev, now) < ev.lateRegMin * 60_000;
}

/** Registration stays open before the next start and throughout late registration. Draft/unscheduled configs stay closed. */
export function regOpen(ev: ScheduledEvent, now: number) {
  if (!isScheduledLive(ev)) return false;
  return now < nextStart(ev, now) || lateRegOpen(ev, now);
}

export function rotatingDeck(ev: ScheduledEvent, start: number, deckIds: string[]) {
  if (ev.deckId !== "rotate") return ev.deckId;
  if (!deckIds.length) return "bomb-pops";
  if (!Number.isFinite(start)) return deckIds[0]!;
  return deckIds[Math.floor(start / 60_000) % deckIds.length]!;
}

/** "0:42", "12:05", "3h 10m", "2d 4h", or Unscheduled */
export function fmtCountdown(ms: number) {
  if (!Number.isFinite(ms) || ms === Number.POSITIVE_INFINITY) return "Unscheduled";
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Map soft sit-table sizes to the three Bomb Pops nicknames (shared fill-to-start queues). */
export function bombPopsSoftNick(size: number): BombPopsEventName {
  if (size <= 3) return "First Freeze";
  if (size <= 6) return "Rocket Rush";
  return "Final Melt";
}
