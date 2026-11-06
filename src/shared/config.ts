/**
 * Central product + compliance config.
 * Paid entry and prize pools are scaffolded but DISABLED by default.
 * Nothing in the web app moves money. See docs/PAID_ENTRY.md.
 */

const env = (k: string): string | undefined =>
  typeof process !== "undefined" ? process.env[k] : undefined;
const flag = (v: string | undefined) => (v ?? "").toLowerCase() === "true";

/** Master switch. Accepts PAID_ENTRY_ENABLED (preferred) or legacy ENTRY_FEES_ENABLED. */
export const PAID_ENTRY_ENABLED: boolean =
  flag(env("PAID_ENTRY_ENABLED")) || flag(env("ENTRY_FEES_ENABLED")) ||
  flag(process.env.NEXT_PUBLIC_PAID_ENTRY_ENABLED);
/** @deprecated use PAID_ENTRY_ENABLED */
export const ENTRY_FEES_ENABLED = PAID_ENTRY_ENABLED;

export const MIN_AGE_PAID = 18;

/**
 * US states that restrict or prohibit paid-entry skill contests.
 * DEFAULT LIST ONLY. Needs legal review before any paid feature ships.
 * Paid entry is hidden in these regions; free play stays available.
 */
export const DEFAULT_BLOCKED_REGIONS = ["AZ", "AR", "CT", "DE", "LA", "MT", "SC", "SD", "TN"] as const;
export const RESTRICTED_STATES: readonly string[] = (env("BLOCKED_REGIONS") ?? "")
  .split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).length
  ? (env("BLOCKED_REGIONS") as string).split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
  : [...DEFAULT_BLOCKED_REGIONS];

export type TierId = "free" | "micro" | "low" | "mid" | "high" | "whale";

export interface EntryTier {
  id: TierId;
  label: string;
  /** Entry fee in USD (USDC). 0 = free. */
  entry: number;
  paid: boolean;
  pointsReward: number;
  color: string;
}

export const ENTRY_TIERS: readonly EntryTier[] = [
  { id: "free", label: "Free", entry: 0, paid: false, pointsReward: 250, color: "jade" },
  { id: "micro", label: "Micro", entry: 1, paid: true, pointsReward: 400, color: "sky" },
  { id: "low", label: "Low", entry: 5, paid: true, pointsReward: 550, color: "violet" },
  { id: "mid", label: "Mid", entry: 25, paid: true, pointsReward: 700, color: "gold" },
  { id: "high", label: "High", entry: 100, paid: true, pointsReward: 900, color: "orange" },
  { id: "whale", label: "Whale", entry: 500, paid: true, pointsReward: 1200, color: "ember" },
];

export const tierById = (id: string) => ENTRY_TIERS.find((t) => t.id === id);

/** Default rake in basis points (1112 = 11.12%). Players keep 88.88%. Server reads RAKE_BPS. */
export const DEFAULT_RAKE_BPS = 1112;
/** Share of gross entries that funds the prize pool (8888 = 88.88%). */
export const PLAYER_POOL_BPS = 10_000 - DEFAULT_RAKE_BPS;

/**
 * How many finishing places get paid for a given field size.
 * Tiny SNGs stay top-heavy; larger fields pay ~20–25% so mid places can cash
 * and keep playing. Published before entry.
 */
export function placesPaid(size: number): number {
  if (size <= 3) return 1;
  if (size <= 6) return 3;   // half the table
  if (size <= 9) return 4;   // room for a min-cash
  if (size <= 18) return 5;
  if (size <= 27) return 7;
  if (size <= 45) return 10;
  if (size <= 90) return 18;
  // Large MTTs: ~22% of the field (min 20, never more than half).
  return Math.min(Math.floor(size / 2), Math.max(20, Math.round(size * 0.22)));
}

/**
 * Published payout table (fraction of the *net* prize pool by finishing place).
 * Top-heavy but sustainable: 1st is ~40–55% on tiny SNGs, ~22–32% on larger
 * fields. Remaining paid places after the top 3 split the rest equally.
 * Fractions always sum to 1.
 */
export function payoutTable(size: number): number[] {
  if (size <= 3) return [1];
  if (size <= 6) return [0.55, 0.3, 0.15];
  if (size <= 9) return [0.4, 0.25, 0.2, 0.15];
  const paid = placesPaid(size);
  // 1st ~22–32% by field size; leave mid-stack cashes for learning loops.
  const top =
    size <= 18 ? [0.32, 0.2, 0.14] :
    size <= 27 ? [0.28, 0.18, 0.12] :
    size <= 45 ? [0.25, 0.16, 0.11] :
    size <= 90 ? [0.23, 0.14, 0.1] :
                 [0.22, 0.13, 0.09];
  const restN = paid - top.length;
  if (restN <= 0) return top.slice(0, paid);
  const each = (1 - top.reduce((a, b) => a + b, 0)) / restN;
  return [...top, ...Array.from({ length: restN }, () => each)];
}

/** Ordinal label: 1st, 2nd, 3rd, 4th…11th… */
export function placeOrdinal(n: number): string {
  const j = n % 10, k = n % 100;
  if (k >= 11 && k <= 13) return `${n}th`;
  if (j === 1) return `${n}st`;
  if (j === 2) return `${n}nd`;
  if (j === 3) return `${n}rd`;
  return `${n}th`;
}

export function prizePool(entrants: number, entry: number, rakeBps = DEFAULT_RAKE_BPS) {
  const gross = Math.round(entrants * entry * 1e6); // micro-units
  const rake = Math.floor((gross * rakeBps) / 10_000);
  return { gross: gross / 1e6, rake: rake / 1e6, net: (gross - rake) / 1e6 };
}

/**
 * Split the net pool by place. Ties (same rank group) share the combined
 * amount for the places they occupy, equally. Amounts in micro-units, floored;
 * remainder dust stays in the pool (reported as `dust`).
 */
export function splitPrizes(netUsd: number, size: number, rankGroups: string[][]) {
  const table = payoutTable(size);
  const net = Math.round(netUsd * 1e6);
  const out: { playerId: string; place: number; amount: number }[] = [];
  let place = 0;
  let paidTotal = 0;
  for (const group of rankGroups) {
    const share = group.reduce((s, _, i) => s + (table[place + i] ?? 0), 0);
    const each = Math.floor((net * share) / group.length);
    for (const id of group) {
      if (each > 0) out.push({ playerId: id, place: place + 1, amount: each / 1e6 });
      paidTotal += each;
    }
    place += group.length;
  }
  return { payouts: out, dust: (net - paidTotal) / 1e6 };
}

export const PREMIUM = {
  name: "Premium",
  priceUsd: 8.88,
  interval: "month",
  perks: [
    "Unlimited custom decks",
    "Advanced stats",
    "Custom avatars & cosmetic badges",
    "Premium-only freerolls (cosmetic + points prizes)",
  ],
  checkoutEnabled: false,
} as const;

export type Eligibility =
  | { ok: true }
  | { ok: false; reason: "disabled" | "age" | "region" | "allowlist" | "cap" };

export function paidEntryEligibility(input: {
  tier: EntryTier;
  age?: number;
  ageConfirmed?: boolean;
  region?: string;
  enabled?: boolean;
  blocked?: readonly string[];
  allowlist?: readonly string[];
  wallet?: string;
}): Eligibility {
  const enabled = input.enabled ?? PAID_ENTRY_ENABLED;
  if (!input.tier.paid) return { ok: true };
  if (!enabled) return { ok: false, reason: "disabled" };
  const adult = input.ageConfirmed === true || (input.age !== undefined && input.age >= MIN_AGE_PAID);
  if (!adult) return { ok: false, reason: "age" };
  const region = (input.region ?? "").toUpperCase();
  const blocked = input.blocked ?? RESTRICTED_STATES;
  if (!region || blocked.includes(region)) return { ok: false, reason: "region" };
  if (input.allowlist && input.allowlist.length && !(input.wallet && input.allowlist.includes(input.wallet))) {
    return { ok: false, reason: "allowlist" };
  }
  return { ok: true };
}

/**
 * Where every entry dollar goes (basis points of gross entries). Players get the lion's share;
 * the rest keeps the lights on and funds the community.
 */
export const POOL_SPLIT = [
  { id: "players", label: "Prize pool (players)", bps: PLAYER_POOL_BPS, color: "#E0115F" },
  { id: "teachers", label: "Instructors (teachers & course creators)", bps: 371, color: "#1E3FAE" },
  { id: "platform", label: "Platform fees", bps: 371, color: "#2B5BFF" },
  { id: "community", label: "Community chest · marketing · promo · treasury", bps: 370, color: "#0E9F6E" },
] as const;

/** Fee slices excluding the player prize pool — even 3-way of 11.12% (371 + 371 + 370 = 1112 bps). */
export const RAKE_SPLIT = POOL_SPLIT.filter((s) => s.id !== "players");

/** Soft-launch Solana wallets. Prize receives buy-ins (88.88% player pools); Ops receives the 11.12% fee split. */
export const PRIZE_WALLET_SOL = process.env.NEXT_PUBLIC_PRIZE_WALLET_SOL || "5pCvMAKJFBkLEwqUhmgDeTkpFnBGd7te3EgMs6jZ9nM4";
export const OPS_WALLET_SOL = process.env.NEXT_PUBLIC_OPS_WALLET_SOL || "kqZjzwxamA6trUrKuVeBpPtwhXhGB1vPRHha7srEGsW";
