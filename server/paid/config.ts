/**
 * Paid-entry server config. DISABLED unless every safety condition is met.
 * The server never holds private keys: it only reads the public chain.
 */
import { DEFAULT_BLOCKED_REGIONS, DEFAULT_RAKE_BPS, type TierId } from "../../src/shared/config";

export type Cluster = "devnet" | "testnet" | "mainnet-beta";

export interface PaidConfig {
  enabled: boolean;
  disabledReason?: string;
  cluster: Cluster;
  rpcUrl: string;
  treasury: string;
  usdcMint: string;
  solUsdRate: number; // manual rate used to quote SOL entries (scaffold; use an oracle later)
  rakeBps: number;
  adminKey: string;
  dynamicEnvironmentId: string;
  allowlist: string[];
  blockedRegions: string[];
  maxEntriesPerDay: number;
  maxDailyUsd: number;
  maxTier: TierId;
  fillTimeoutMs: number;
  currencies: ("USDC" | "SOL")[];
}

const USDC_MINTS: Record<Cluster, string> = {
  "mainnet-beta": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  testnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
};
const RPC: Record<Cluster, string> = {
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
};

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const isAddress = (s: string) => BASE58.test(s);
const list = (v?: string) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export function loadPaidConfig(env: Record<string, string | undefined> = process.env): PaidConfig {
  const raw = (env.SOLANA_CLUSTER ?? "devnet").trim() as Cluster;
  const cluster: Cluster = raw in RPC ? raw : "devnet";
  const cfg: PaidConfig = {
    enabled: (env.PAID_ENTRY_ENABLED ?? "").toLowerCase() === "true",
    cluster,
    rpcUrl: env.SOLANA_RPC_URL || RPC[cluster],
    treasury: (env.TREASURY_ADDRESS ?? "").trim(),
    usdcMint: env.USDC_MINT || USDC_MINTS[cluster],
    solUsdRate: Number(env.SOL_USD_RATE) || 0,
    rakeBps: Math.min(3000, Math.max(0, Number(env.RAKE_BPS ?? DEFAULT_RAKE_BPS))),
    adminKey: env.ADMIN_KEY ?? "",
    dynamicEnvironmentId: env.DYNAMIC_ENVIRONMENT_ID ?? "",
    allowlist: list(env.FRIENDS_ALLOWLIST),
    blockedRegions: list(env.BLOCKED_REGIONS).map((s) => s.toUpperCase()).length
      ? list(env.BLOCKED_REGIONS).map((s) => s.toUpperCase())
      : [...DEFAULT_BLOCKED_REGIONS],
    maxEntriesPerDay: Number(env.MAX_ENTRIES_PER_DAY) || 10,
    maxDailyUsd: Number(env.MAX_DAILY_USD) || 50,
    maxTier: (env.MAX_TIER as TierId) || "low",
    fillTimeoutMs: (Number(env.FILL_TIMEOUT_MIN) || 30) * 60_000,
    currencies: list(env.PAID_CURRENCIES || "USDC,SOL").filter((c): c is "USDC" | "SOL" => c === "USDC" || c === "SOL"),
  };
  const off = (why: string) => {
    cfg.enabled = false;
    cfg.disabledReason = cfg.disabledReason ?? why;
  };
  if (!cfg.enabled) off("PAID_ENTRY_ENABLED is not true");
  if (cluster === "mainnet-beta" && (env.MAINNET_ACK ?? "").toLowerCase() !== "true") off("mainnet refused: set MAINNET_ACK=true only after legal review");
  if (!isAddress(cfg.treasury)) off("TREASURY_ADDRESS missing or invalid");
  if (!cfg.adminKey || cfg.adminKey.length < 24) off("ADMIN_KEY missing or shorter than 24 chars");
  if (!cfg.dynamicEnvironmentId) off("DYNAMIC_ENVIRONMENT_ID missing");
  if (cfg.allowlist.length === 0) off("FRIENDS_ALLOWLIST is empty (friends-only testing required)");
  if (cfg.currencies.includes("SOL") && !cfg.solUsdRate) cfg.currencies = cfg.currencies.filter((c) => c !== "SOL");
  if (!cfg.currencies.length) off("no currency configured");
  return cfg;
}

/** Safe public view (no secrets). */
export function publicPaidConfig(c: PaidConfig) {
  return {
    enabled: c.enabled,
    disabledReason: c.enabled ? undefined : "Paid entry is not available yet.",
    cluster: c.cluster,
    treasury: c.enabled ? c.treasury : undefined,
    currencies: c.currencies,
    rakeBps: c.rakeBps,
    maxTier: c.maxTier,
    fillTimeoutMin: Math.round(c.fillTimeoutMs / 60_000),
  };
}
