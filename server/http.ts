/** HTTP routes: health, public paid config, entry intents/confirm, admin payout queue. */
import type { IncomingMessage, ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { ENTRY_TIERS, payoutTable } from "../src/shared/config";
import { SNG_SIZES } from "../src/shared/match";
import { publicPaidConfig, type PaidConfig } from "./paid/config";
import type { PaidLedger } from "./paid/ledger";
import type { WalletVerifier } from "./paid/auth";

export interface HttpDeps {
  cfg: PaidConfig;
  ledger?: PaidLedger;
  verifyWallet?: WalletVerifier;
  stats: () => Record<string, number>;
  /** Returns true when a browser Origin may call this server. */
  originOk: (origin: string) => boolean;
  /** Region from a trusted edge/geo header, e.g. set by your proxy. */
  regionHeader?: string;
  lobbyInfo?: () => unknown[];
  events?: {
    list: () => unknown[];
    get: (id: string) => unknown;
    register: (b: { eventId: string; playerId: string; handle: string; name: string }) => unknown;
    unregister: (eventId: string, playerId: string) => boolean;
  };
}

const MAX_BODY = 16_384;

/** CORS_ORIGINS entries are exact origins or patterns where `*` matches letters, digits and dashes, or "*" for any. */
export function makeOriginMatcher(origins: string[]) {
  if (!origins.length || origins.includes("*")) return () => true;
  const res = origins.map(
    (o) => new RegExp("^" + o.replace(/[.+?^${}()|[\]\\/]/g, "\\$&").replace(/\*/g, "[a-z0-9-]*") + "$", "i"),
  );
  return (origin: string) => res.some((r) => r.test(origin));
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY) throw new Error("Body too large");
    chunks.push(c as Buffer);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function adminOk(req: IncomingMessage, key: string) {
  const got = String(req.headers["x-admin-key"] ?? "");
  if (!key || got.length !== key.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(key));
}

export function makeHandler(d: HttpDeps) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const origin = String(req.headers.origin ?? "");
    const send = (code: number, data: unknown) => {
      res.writeHead(code, {
        "content-type": "application/json",
        "access-control-allow-origin": origin && d.originOk(origin) ? origin : "null",
        vary: "origin",
        "access-control-allow-headers": "content-type, authorization, x-admin-key",
        "access-control-allow-methods": "GET, POST, OPTIONS",
      });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url ?? "/", "http://x");
      const path = url.pathname;
      if (req.method === "OPTIONS") return send(204, {});
      if (path === "/" || path === "/health") return send(200, { ok: true, service: "huddle-game-server", ...d.stats() });

      if (path === "/queues" && req.method === "GET") {
        return send(200, { queues: d.lobbyInfo?.() ?? [], stats: d.stats() });
      }

      if (path === "/events" && req.method === "GET") {
        return send(200, { events: d.events?.list() ?? [] });
      }

      const evGet = path.match(/^\/events\/([\w-]+)$/);
      if (evGet && req.method === "GET") {
        const snap = d.events?.get(evGet[1]);
        if (!snap) return send(404, { error: "not found" });
        return send(200, snap);
      }

      if (path === "/events/register" && req.method === "POST") {
        if (!d.events) return send(503, { error: "events unavailable" });
        const b = await body(req);
        const r = d.events.register({
          eventId: String(b.eventId ?? ""),
          playerId: String(b.playerId ?? ""),
          handle: String(b.handle ?? ""),
          name: String(b.name ?? ""),
        }) as { ok?: boolean };
        return send(r && r.ok ? 200 : 400, r);
      }

      if (path === "/events/unregister" && req.method === "POST") {
        if (!d.events) return send(503, { error: "events unavailable" });
        const b = await body(req);
        const ok = d.events.unregister(String(b.eventId ?? ""), String(b.playerId ?? ""));
        return send(200, { ok });
      }

      if (path === "/paid/config") {
        return send(200, {
          ...publicPaidConfig(d.cfg),
          tiers: ENTRY_TIERS,
          payoutTables: Object.fromEntries([2, ...SNG_SIZES].map((n) => [n, payoutTable(n)])),
        });
      }

      if (path.startsWith("/admin/")) {
        if (!adminOk(req, d.cfg.adminKey)) return send(401, { error: "unauthorized" });
        if (!d.ledger) return send(503, { error: "paid entry disabled" });
        if (req.method === "GET" && path === "/admin/payouts") return send(200, { payouts: d.ledger.queue() });
        const m = path.match(/^\/admin\/payouts\/([\w-]+)\/paid$/);
        if (req.method === "POST" && m) {
          const b = await body(req);
          return send(200, { payout: d.ledger.markPaid(m[1], String(b.signature ?? "")) });
        }
        return send(404, { error: "not found" });
      }

      if (path.startsWith("/paid/")) {
        if (!d.cfg.enabled || !d.ledger || !d.verifyWallet) return send(403, { error: "Paid entry is not available yet." });
        const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
        const wallet = await d.verifyWallet(token);
        const region = d.regionHeader ? String(req.headers[d.regionHeader] ?? "") : "";
        if (req.method === "POST" && path === "/paid/intents") {
          const b = await body(req);
          const r = d.ledger.createIntent({
            wallet, tableKey: String(b.tableKey), size: Number(b.size), tier: String(b.tier),
            currency: b.currency === "SOL" ? "SOL" : "USDC", ageConfirmed: b.ageConfirmed === true, region,
          });
          return send(200, r);
        }
        const m = path.match(/^\/paid\/intents\/([\w-]+)\/confirm$/);
        if (req.method === "POST" && m) {
          const e = d.ledger.entries.get(m[1]);
          if (!e || e.wallet !== wallet) return send(404, { error: "not found" });
          const b = await body(req);
          return send(200, { entry: await d.ledger.confirm(m[1], b.signature ? String(b.signature) : undefined) });
        }
        return send(404, { error: "not found" });
      }
      return send(404, { error: "not found" });
    } catch (e) {
      return send(400, { error: (e as Error).message });
    }
  };
}
