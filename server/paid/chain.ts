/**
 * Read-only on-chain verification. Uses public JSON-RPC only — no keys.
 */
export interface PaymentExpectation {
  signature: string;
  reference: string;
  recipient: string; // treasury wallet (owner)
  currency: "USDC" | "SOL";
  /** Base units: lamports for SOL, 6-decimal micro-units for USDC. */
  amount: bigint;
  mint?: string;
}

export type VerifyResult =
  | { ok: true; payer: string; amount: bigint }
  | { ok: false; reason: string; retryable?: boolean };

export interface ChainVerifier {
  verify(exp: PaymentExpectation): Promise<VerifyResult>;
  /** Find a finalized signature that includes the reference key (Solana Pay style). */
  findSignature(reference: string): Promise<string | null>;
}

type Json = Record<string, unknown>;

export class RpcChainVerifier implements ChainVerifier {
  constructor(private rpcUrl: string, private fetchImpl: typeof fetch = fetch) {}

  private async rpc(method: string, params: unknown[]) {
    const r = await this.fetchImpl(this.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const j = (await r.json()) as { result?: unknown; error?: { message: string } };
    if (j.error) throw new Error(j.error.message);
    return j.result;
  }

  async findSignature(reference: string) {
    const res = (await this.rpc("getSignaturesForAddress", [reference, { commitment: "finalized", limit: 5 }])) as { signature: string; err: unknown }[];
    const hit = res?.find((x) => !x.err);
    return hit?.signature ?? null;
  }

  async verify(exp: PaymentExpectation): Promise<VerifyResult> {
    const tx = (await this.rpc("getTransaction", [
      exp.signature,
      { commitment: "finalized", encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
    ])) as Json | null;
    return checkParsedTransaction(tx, exp);
  }
}

/** Pure check of a jsonParsed, finalized transaction against expectations (unit-tested). */
export function checkParsedTransaction(tx: Json | null, exp: PaymentExpectation): VerifyResult {
  if (!tx) return { ok: false, reason: "not found or not finalized yet", retryable: true };
  const meta = tx.meta as Json | undefined;
  if (!meta || meta.err) return { ok: false, reason: "transaction failed" };
  const msg = (tx.transaction as Json)?.message as Json;
  const keys = ((msg?.accountKeys as (Json | string)[]) ?? []).map((k) => (typeof k === "string" ? k : String(k.pubkey)));
  if (!keys.includes(exp.reference)) return { ok: false, reason: "reference key not in transaction" };
  const payer = keys[0];

  if (exp.currency === "SOL") {
    const idx = keys.indexOf(exp.recipient);
    if (idx < 0) return { ok: false, reason: "recipient not in transaction" };
    const pre = BigInt((meta.preBalances as number[])[idx] ?? 0);
    const post = BigInt((meta.postBalances as number[])[idx] ?? 0);
    const delta = post - pre;
    if (delta < exp.amount) return { ok: false, reason: `amount too low (${delta} < ${exp.amount})` };
    return { ok: true, payer, amount: delta };
  }

  const find = (arr: unknown) =>
    ((arr as Json[]) ?? []).find((b) => b.mint === exp.mint && b.owner === exp.recipient) as Json | undefined;
  const preB = find(meta.preTokenBalances);
  const postB = find(meta.postTokenBalances);
  if (!postB) return { ok: false, reason: "no token balance for recipient + mint" };
  const amt = (b?: Json) => BigInt(((b?.uiTokenAmount as Json)?.amount as string) ?? "0");
  const delta = amt(postB) - amt(preB);
  if (delta < exp.amount) return { ok: false, reason: `amount too low (${delta} < ${exp.amount})` };
  return { ok: true, payer, amount: delta };
}
