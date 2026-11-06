import { createServer } from "node:http";
import { Server } from "socket.io";
import { Lobby } from "./game";
import { AVATARS } from "../src/shared/match";
import { loadPaidConfig } from "./paid/config";
import { PaidLedger } from "./paid/ledger";
import { RpcChainVerifier } from "./paid/chain";
import { dynamicWalletVerifier } from "./paid/auth";
import { makeHandler, makeOriginMatcher } from "./http";
import { allBombPopsSnapshots, eventSnapshot, registerEvent, unregisterEvent } from "./events";

const PORT = Number(process.env.PORT) || 4000;
const ORIGINS = (process.env.CORS_ORIGINS ?? "*").split(",").map((s) => s.trim()).filter(Boolean);
const originOk = makeOriginMatcher(ORIGINS);

const cfg = loadPaidConfig();
const ledger = cfg.enabled ? new PaidLedger(cfg, new RpcChainVerifier(cfg.rpcUrl), Date.now, process.env.LEDGER_FILE) : undefined;
const verifyWallet = cfg.enabled ? dynamicWalletVerifier(cfg.dynamicEnvironmentId) : undefined;
console.log(cfg.enabled ? `Paid entry ENABLED on ${cfg.cluster}` : `Paid entry disabled (${cfg.disabledReason})`);

const lobby: Lobby = new Lobby(
  {
    now: () => Date.now(),
    emitMatch: (ids, snap) => ids.forEach((id) => io.to(id).emit("match", snap)),
    emitQueue: (id, info) => io.to(id).emit("queue", info),
  },
  ledger,
  cfg.enabled,
);

const http = createServer(
  makeHandler({
    cfg,
    ledger,
    verifyWallet,
    stats: () => lobby.stats(),
    originOk,
    regionHeader: process.env.REGION_HEADER,
    lobbyInfo: () => lobby.lobbyInfo(),
    events: {
      list: () => allBombPopsSnapshots(),
      get: (id) => eventSnapshot(id),
      register: (b) => registerEvent(b),
      unregister: (eventId, playerId) => unregisterEvent(eventId, playerId),
    },
  }),
);
const io = new Server(http, {
  cors: { origin: (origin, cb) => cb(null, !origin || originOk(origin)) },
});

const clean = (s: unknown, max: number) =>
  String(s ?? "").replace(/[^\p{L}\p{N} _.-]/gu, "").trim().slice(0, max);
const cleanId = (s: unknown) => String(s ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);

io.on("connection", (socket) => {
  let seat: { id: string; name: string; avatar: string; wallet?: string } | null = null;

  socket.on("hello", async (p: { name?: string; avatar?: string; walletToken?: string; playerId?: string }, ack?: (r: unknown) => void) => {
    const name = clean(p?.name, 18) || `Guest${Math.floor(Math.random() * 9000 + 1000)}`;
    const avatar = AVATARS.includes(String(p?.avatar)) ? String(p?.avatar) : AVATARS[0];
    let wallet: string | undefined;
    if (p?.walletToken && verifyWallet) {
      try { wallet = await verifyWallet(p.walletToken); } catch { /* free play still works */ }
    }
    const requested = cleanId(p?.playerId);
    // Prefer client auth id; fall back to socket id only for anonymous guests.
    const playerId = requested.length >= 2 ? requested : socket.id;
    seat = { id: playerId, name, avatar, wallet };
    socket.join(playerId);
    const resumed = lobby.resume(playerId);
    ack?.({ ok: true, id: playerId, name, wallet: !!wallet, resumed: !!resumed });
    if (resumed?.match) socket.emit("match", resumed.match);
    if (resumed?.queue) socket.emit("queue", resumed.queue);
    socket.emit("lobby", { queues: lobby.lobbyInfo(), stats: lobby.stats(), events: allBombPopsSnapshots() });
  });

  socket.on("queue", (req: Record<string, unknown>, ack?: (r: unknown) => void) => {
    try {
      if (!seat) throw new Error("Say hello first");
      // Soft launch: only Bomb Pops freeroll online tables; never invent bots.
      const deckId = String(req?.deckId || "");
      const tier = String(req?.tier || "free");
      if (deckId && deckId !== "bomb-pops") throw new Error("Soft launch online play is Bomb Pops only");
      if (tier !== "free") throw new Error("Paid entry is coming soon. Free freeroll / practice only for now.");
      const key = lobby.join({ ...seat, entryId: req?.entryId ? String(req.entryId) : undefined }, { ...req, deckId: deckId || "bomb-pops", tier: "free" } as never);
      ack?.({ ok: true, key });
    } catch (e) {
      ack?.({ ok: false, error: (e as Error).message });
    }
  });

  socket.on("leaveQueue", () => seat && lobby.leaveQueue(seat.id));
  socket.on("forfeit", () => seat && lobby.forfeit(seat.id));
  socket.on("answer", (choice: number, ack?: (r: unknown) => void) => {
    const ok = seat ? lobby.answer(seat.id, Number(choice)) : false;
    if (typeof ack === "function") ack({ ok });
  });
  socket.on("disconnect", () => seat && lobby.disconnect(seat.id));
});

setInterval(() => lobby.tick(), 250);
setInterval(() => io.emit("lobby", { queues: lobby.lobbyInfo(), stats: lobby.stats(), events: allBombPopsSnapshots() }), 3000);

http.listen(PORT, "0.0.0.0", () => console.log(`SHOTCLOCK game server on :${PORT}`));
