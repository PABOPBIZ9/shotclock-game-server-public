/**
 * Paid-entry ledger: entry intents, exactly-once crediting, refunds for
 * unfilled tables, settlement into a MANUAL admin payout queue.
 * Nothing here sends funds. The owner pays winners from their own wallet
 * and records the signature via the admin API.
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { ENTRY_TIERS, paidEntryEligibility, payoutTable, prizePool, splitPrizes, tierById } from "../../src/shared/config";
import type { ChainVerifier } from "./chain";
import { isAddress, type PaidConfig } from "./config";

export type EntryStatus = "pending" | "paid" | "seated" | "settled" | "refund_due" | "refunded" | "expired";

export interface Entry {
  id: string;
  wallet: string;
  tableKey: string;
  size: number;
  tier: string;
  currency: "USDC" | "SOL";
  usd: number;
  amount: string; // base units as string (bigint)
  reference: string;
  recipient: string;
  mint?: string;
  status: EntryStatus;
  signature?: string;
  createdAt: number;
  paidAt?: number;
  matchId?: string;
}

export interface Payout {
  id: string;
  kind: "prize" | "refund";
  wallet: string;
  currency: "USDC" | "SOL";
  amount: string; // base units
  usd: number;
  place?: number;
  matchId?: string;
  entryIds: string[];
  status: "due" | "paid";
  signature?: string;
  createdAt: number;
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function base58(buf: Uint8Array) {
  let n = BigInt("0x" + Buffer.from(buf).toString("hex"));
  let s = "";
  while (n > 0n) {
    s = B58[Number(n % 58n)] + s;
    n /= 58n;
  }
  for (const b of buf) {
    if (b !== 0) break;
    s = "1" + s;
  }
  return s;
}
/** Random 32-byte public key used only as a Solana Pay reference (no private key exists for it). */
export const newReference = () => base58(randomBytes(32));
const id = (p: string) => `${p}_${randomBytes(8).toString("hex")}`;
const DAY = 86_400_000;

export class PaidLedger {
  entries = new Map<string, Entry>();
  payouts = new Map<string, Payout>();
  usedSignatures = new Set<string>();

  constructor(private cfg: PaidConfig, private chain: ChainVerifier, private now: () => number = Date.now, private file?: string) {
    if (file && existsSync(file)) {
      const j = JSON.parse(readFileSync(file, "utf8"));
      (j.entries ?? []).forEach((e: Entry) => this.entries.set(e.id, e));
      (j.payouts ?? []).forEach((p: Payout) => this.payouts.set(p.id, p));
      for (const e of this.entries.values()) if (e.signature) this.usedSignatures.add(e.signature);
    }
  }

  private save() {
    if (!this.file) return;
    writeFileSync(this.file, JSON.stringify({ entries: [...this.entries.values()], payouts: [...this.payouts.values()] }));
  }

  private toBase(currency: "USDC" | "SOL", usd: number): bigint {
    if (currency === "USDC") return BigInt(Math.round(usd * 1e6));
    if (!this.cfg.solUsdRate) throw new Error("SOL pricing not configured");
    return BigInt(Math.round((usd / this.cfg.solUsdRate) * 1e9));
  }

  createIntent(input: { wallet: string; tableKey: string; size: number; tier: string; currency: "USDC" | "SOL"; ageConfirmed: boolean; region?: string }) {
    if (!this.cfg.enabled) throw new Error("Paid entry is disabled");
    if (!isAddress(input.wallet)) throw new Error("Invalid wallet");
    const tier = tierById(input.tier);
    if (!tier || !tier.paid) throw new Error("Unknown paid tier");
    const maxIdx = ENTRY_TIERS.findIndex((t) => t.id === this.cfg.maxTier);
    if (ENTRY_TIERS.indexOf(tier) > maxIdx) throw new Error("Buy-in level not available");
    if (!this.cfg.currencies.includes(input.currency)) throw new Error("Currency not available");
    const elig = paidEntryEligibility({
      tier, enabled: true, ageConfirmed: input.ageConfirmed, region: input.region,
      blocked: this.cfg.blockedRegions, allowlist: this.cfg.allowlist, wallet: input.wallet,
    });
    if (!elig.ok) throw new Error(`Not eligible: ${elig.reason}`);
    // per-user caps (rolling 24h, counting paid/seated/pending)
    const since = this.now() - DAY;
    const mine = [...this.entries.values()].filter((e) => e.wallet === input.wallet && e.createdAt >= since && !["expired", "refunded", "refund_due"].includes(e.status));
    if (mine.length >= this.cfg.maxEntriesPerDay) throw new Error("Daily entry limit reached");
    if (mine.reduce((s, e) => s + e.usd, 0) + tier.entry > this.cfg.maxDailyUsd) throw new Error("Daily spend limit reached");
    if (mine.some((e) => e.tableKey === input.tableKey && (e.status === "paid" || e.status === "pending"))) throw new Error("Already entered this table");

    const e: Entry = {
      id: id("ent"), wallet: input.wallet, tableKey: input.tableKey, size: input.size, tier: tier.id,
      currency: input.currency, usd: tier.entry, amount: this.toBase(input.currency, tier.entry).toString(),
      reference: newReference(), recipient: this.cfg.treasury,
      mint: input.currency === "USDC" ? this.cfg.usdcMint : undefined,
      status: "pending", createdAt: this.now(),
    };
    this.entries.set(e.id, e);
    this.save();
    return { entry: e, payUrl: solanaPayUrl(e), payoutTable: payoutTable(e.size), rakeBps: this.cfg.rakeBps };
  }

  /** Verify on-chain and credit exactly once. Idempotent. */
  async confirm(entryId: string, signature?: string): Promise<Entry> {
    const e = this.entries.get(entryId);
    if (!e) throw new Error("Unknown entry");
    if (e.status !== "pending") return e; // already credited / closed: idempotent
    const sig = signature ?? (await this.chain.findSignature(e.reference));
    if (!sig) throw new Error("Payment not found yet");
    if (this.usedSignatures.has(sig)) throw new Error("Signature already used");
    const r = await this.chain.verify({
      signature: sig, reference: e.reference, recipient: e.recipient, currency: e.currency, amount: BigInt(e.amount), mint: e.mint,
    });
    if (!r.ok) throw new Error(`Payment not valid: ${r.reason}`);
    if (r.payer !== e.wallet) throw new Error("Payment must come from the entrant wallet");
    // re-check after await (another confirm may have raced)
    if (e.status !== "pending" || this.usedSignatures.has(sig)) return e;
    this.usedSignatures.add(sig);
    e.status = "paid";
    e.signature = sig;
    e.paidAt = this.now();
    this.save();
    return e;
  }

  paidFor(tableKey: string) {
    return [...this.entries.values()].filter((x) => x.tableKey === tableKey && x.status === "paid").sort((a, b) => (a.paidAt ?? 0) - (b.paidAt ?? 0));
  }

  markSeated(entryIds: string[], matchId: string) {
    for (const i of entryIds) {
      const e = this.entries.get(i);
      if (e && e.status === "paid") { e.status = "seated"; e.matchId = matchId; }
    }
    this.save();
  }

  /** Tables that didn't fill in time: queue full refunds (no rake). Expire unpaid intents. */
  refundUnfilled() {
    const now = this.now();
    const out: Payout[] = [];
    for (const e of this.entries.values()) {
      if (e.status === "pending" && now - e.createdAt > this.cfg.fillTimeoutMs) e.status = "expired";
      if (e.status === "paid" && now - (e.paidAt ?? e.createdAt) > this.cfg.fillTimeoutMs) {
        e.status = "refund_due";
        const p: Payout = { id: id("pay"), kind: "refund", wallet: e.wallet, currency: e.currency, amount: e.amount, usd: e.usd, entryIds: [e.id], status: "due", createdAt: now };
        this.payouts.set(p.id, p);
        out.push(p);
      }
    }
    if (out.length) this.save();
    return out;
  }

  /** Called when a paid match finishes. rankGroups = ties grouped (skill ranking). */
  settle(matchId: string, rankGroups: string[][], walletOf: (playerId: string) => string | undefined) {
    const seated = [...this.entries.values()].filter((e) => e.matchId === matchId && e.status === "seated");
    if (!seated.length) return [];
    const currency = seated[0].currency;
    const usd = seated[0].usd;
    const size = seated[0].size;
    const pool = prizePool(seated.length, usd, this.cfg.rakeBps);
    const { payouts } = splitPrizes(pool.net, size, rankGroups);
    const out: Payout[] = [];
    for (const p of payouts) {
      const wallet = walletOf(p.playerId);
      if (!wallet) continue;
      const base = this.toBase(currency, p.amount);
      const po: Payout = { id: id("pay"), kind: "prize", wallet, currency, amount: base.toString(), usd: p.amount, place: p.place, matchId, entryIds: seated.filter((e) => e.wallet === wallet).map((e) => e.id), status: "due", createdAt: this.now() };
      this.payouts.set(po.id, po);
      out.push(po);
    }
    seated.forEach((e) => (e.status = "settled"));
    this.save();
    return out;
  }

  markPaid(payoutId: string, signature: string) {
    const p = this.payouts.get(payoutId);
    if (!p) throw new Error("Unknown payout");
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) throw new Error("Invalid signature");
    if (p.status === "paid") return p;
    p.status = "paid";
    p.signature = signature;
    if (p.kind === "refund") p.entryIds.forEach((i) => { const e = this.entries.get(i); if (e) e.status = "refunded"; });
    this.save();
    return p;
  }

  queue() {
    return [...this.payouts.values()].sort((a, b) => a.createdAt - b.createdAt);
  }
}

export function solanaPayUrl(e: Entry) {
  const amount = e.currency === "USDC" ? (Number(e.amount) / 1e6).toString() : (Number(e.amount) / 1e9).toString();
  const q = new URLSearchParams({ amount, reference: e.reference, label: "SHOTCLOCK entry", memo: e.id });
  if (e.mint) q.set("spl-token", e.mint);
  return `solana:${e.recipient}?${q}`;
}
