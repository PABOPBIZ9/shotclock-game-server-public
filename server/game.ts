/** Matchmaking + match orchestration, transport-agnostic (tested without sockets). */
import { DECKS, getDeck } from "../src/shared/decks";
import { ENTRY_TIERS } from "../src/shared/config";
import { FORMATS, Match, SNG_SIZES, type Format, type MatchSnapshot, type Speed, SPEEDS } from "../src/shared/match";
import type { PaidLedger } from "./paid/ledger";

export interface Seat {
  id: string;
  name: string;
  avatar: string;
  /** Verified wallet (paid tables only). */
  wallet?: string;
  /** Paid entry id (paid tables only). */
  entryId?: string;
}

export interface QueueRequest {
  format: Format;
  speed: Speed;
  deckId: string;
  size?: number;
  tier?: string;
}

export interface Hooks {
  emitMatch(playerIds: string[], snap: MatchSnapshot): void;
  emitQueue(playerId: string, info: { key: string; count: number; need: number } | null): void;
  now(): number;
}

interface Queue {
  key: string;
  req: Required<QueueRequest>;
  seats: Seat[];
  startAt?: number;
}

const TOURNEY_GRACE_MS = 30_000;

export class Lobby {
  queues = new Map<string, Queue>();
  matches = new Map<string, Match>();
  playerMatch = new Map<string, string>();
  paidMatches = new Map<string, boolean>();
  private n = 0;
  private wallets = new Map<string, string>();
  /** Last activity for queue seats (reconnect grace). */
  private lastSeen = new Map<string, number>();
  constructor(private hooks: Hooks, private ledger?: PaidLedger, private paidEnabled = false) {}

  validate(req: QueueRequest): Required<QueueRequest> {
    if (!(req.format in FORMATS)) throw new Error("Unknown format");
    if (!(req.speed in SPEEDS)) throw new Error("Unknown speed");
    if (!getDeck(req.deckId)) throw new Error("Unknown deck");
    const def = FORMATS[req.format];
    const n = Number(req.size);
    let size: number;
    if (req.format === "headsup") size = 2;
    else if (req.format === "sng") {
      if (!(SNG_SIZES as readonly number[]).includes(n)) throw new Error("Unsupported table size");
      size = n;
    } else size = def.max;
    const tier = ENTRY_TIERS.find((t) => t.id === (req.tier ?? "free"));
    if (!tier) throw new Error("Unknown tier");
    if (tier.paid && !(this.paidEnabled && this.ledger)) throw new Error("Paid entry is coming soon. Free play only for now.");
    if (tier.paid && req.format === "tournament") throw new Error("Paid tournaments use scheduled registration (not yet available)");
    return { format: req.format, speed: req.speed, deckId: req.deckId, size, tier: tier.id };
  }

  join(seat: Seat, raw: QueueRequest) {
    if (!seat?.id) throw new Error("Stable player id required");
    if (this.playerMatch.has(seat.id)) throw new Error("Already in a match");
    const req = this.validate(raw);
    const key = Lobby.key(req);
    if (req.tier !== "free") {
      const e = seat.entryId ? this.ledger!.entries.get(seat.entryId) : undefined;
      if (!e || e.status !== "paid" || e.tableKey !== key || !seat.wallet || e.wallet !== seat.wallet) {
        throw new Error("A confirmed paid entry for this table is required");
      }
      this.wallets.set(seat.id, seat.wallet);
    }
    let q = this.queues.get(key);
    // Idempotent: same player already waiting on this exact table.
    if (q?.seats.some((s) => s.id === seat.id)) {
      this.lastSeen.set(seat.id, this.hooks.now());
      this.broadcastQueue(q);
      return key;
    }
    this.leaveQueue(seat.id);
    if (!q) {
      q = { key, req, seats: [] };
      this.queues.set(key, q);
    }
    // Atomic capacity for fill-to-start SNG / HU (never over-seat).
    if (req.format !== "tournament" && q.seats.length >= q.req.size) {
      throw new Error("Table is full");
    }
    q.seats.push(seat);
    this.lastSeen.set(seat.id, this.hooks.now());
    this.afterJoin(q);
    return key;
  }

  /** Rebind after refresh: restore match or queue without double-seating. */
  resume(playerId: string): { match?: MatchSnapshot; queue?: { key: string; count: number; need: number } } | null {
    this.lastSeen.set(playerId, this.hooks.now());
    const mid = this.playerMatch.get(playerId);
    const m = mid ? this.matches.get(mid) : undefined;
    if (m) {
      m.setConnected(playerId, true);
      this.push(m);
      return { match: m.snapshot() };
    }
    for (const q of this.queues.values()) {
      if (q.seats.some((s) => s.id === playerId)) {
        const need = q.req.format === "tournament" ? FORMATS.tournament.min : q.req.size;
        this.broadcastQueue(q);
        return { queue: { key: q.key, count: q.seats.length, need } };
      }
    }
    return null;
  }

  static key(req: Required<QueueRequest>) {
    return `${req.format}:${req.speed}:${req.deckId}:${req.size}:${req.tier}`;
  }

  private afterJoin(q: Queue) {
    const def = FORMATS[q.req.format];
    if (q.req.format === "tournament") {
      if (q.seats.length >= def.min && !q.startAt) q.startAt = this.hooks.now() + TOURNEY_GRACE_MS;
      if (q.seats.length >= def.max) this.launch(q);
    } else if (q.seats.length >= q.req.size) {
      this.launch(q);
    }
    this.broadcastQueue(q);
  }

  private broadcastQueue(q: Queue) {
    const need = q.req.format === "tournament" ? FORMATS.tournament.min : q.req.size;
    for (const s of q.seats) this.hooks.emitQueue(s.id, { key: q.key, count: q.seats.length, need });
  }

  leaveQueue(playerId: string) {
    for (const q of this.queues.values()) {
      const i = q.seats.findIndex((s) => s.id === playerId);
      if (i >= 0) {
        q.seats.splice(i, 1);
        this.hooks.emitQueue(playerId, null);
        if (q.req.format === "tournament" && q.seats.length < FORMATS.tournament.min) q.startAt = undefined;
        if (q.seats.length === 0) this.queues.delete(q.key);
        else this.broadcastQueue(q);
      }
    }
  }

  private launch(q: Queue) {
    const deck = getDeck(q.req.deckId) ?? DECKS[0];
    const id = `m${++this.n}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    const paid = q.req.tier !== "free";
    // Paid tables: pure skill ranking (correct, then total time; ties share prizes).
    const m = new Match({
      id, format: q.req.format, speed: q.req.speed, deck, seed: Math.floor(Math.random() * 2 ** 31),
      rankBy: paid ? "skill" : "points", maxPlayers: q.req.format === "tournament" ? FORMATS.tournament.max : q.req.size,
    });
    const seats = q.seats.splice(0, m.maxPlayers);
    if (paid) this.ledger!.markSeated(seats.map((s) => s.entryId!).filter(Boolean), id);
    this.paidMatches.set(id, paid);
    // random seating
    seats.sort(() => Math.random() - 0.5).forEach((s) => m.addPlayer(s));
    m.start(this.hooks.now());
    this.matches.set(id, m);
    seats.forEach((s) => {
      this.playerMatch.set(s.id, id);
      this.hooks.emitQueue(s.id, null);
    });
    if (q.seats.length === 0) this.queues.delete(q.key);
    this.push(m);
  }

  answer(playerId: string, choice: number) {
    const id = this.playerMatch.get(playerId);
    const m = id && this.matches.get(id);
    if (!m) return false;
    const ok = m.answer(playerId, choice, this.hooks.now());
    if (ok) {
      m.tick(this.hooks.now());
      this.push(m);
    }
    return ok;
  }

  disconnect(playerId: string) {
    // Keep queue seat briefly so a refresh can resume; match marks disconnected.
    this.lastSeen.set(playerId, this.hooks.now());
    const id = this.playerMatch.get(playerId);
    const m = id && this.matches.get(id);
    if (m) {
      m.setConnected(playerId, false);
      this.push(m);
    }
  }

  /** Leave a running match: player forfeits remaining questions. */
  forfeit(playerId: string) {
    const id = this.playerMatch.get(playerId);
    const m = id && this.matches.get(id);
    if (!m) return;
    const p = m.players.find((x) => x.id === playerId);
    if (p && !p.eliminated) {
      p.eliminated = true;
      p.eliminatedAt = m.qIndex;
    }
    this.playerMatch.delete(playerId);
    m.tick(this.hooks.now());
    this.push(m);
  }

  tick() {
    const now = this.hooks.now();
    // Drop orphan queue seats after 2 minutes without reconnect (no fake bots fill them).
    const GRACE = 120_000;
    for (const q of [...this.queues.values()]) {
      const before = q.seats.length;
      q.seats = q.seats.filter((s) => {
        const seen = this.lastSeen.get(s.id) ?? now;
        if (now - seen > GRACE && !this.playerMatch.has(s.id)) {
          this.hooks.emitQueue(s.id, null);
          this.lastSeen.delete(s.id);
          return false;
        }
        return true;
      });
      if (q.seats.length !== before) {
        if (q.req.format === "tournament" && q.seats.length < FORMATS.tournament.min) q.startAt = undefined;
        if (q.seats.length === 0) this.queues.delete(q.key);
        else this.broadcastQueue(q);
      }
    }
    if (this.ledger && this.paidEnabled) {
      const refunds = this.ledger.refundUnfilled();
      if (refunds.length) {
        const ids = new Set(refunds.flatMap((r) => r.entryIds));
        for (const q of this.queues.values()) q.seats = q.seats.filter((s) => !s.entryId || !ids.has(s.entryId));
      }
    }
    for (const q of [...this.queues.values()]) if (q.startAt && now >= q.startAt) this.launch(q);
    for (const m of [...this.matches.values()]) {
      if (m.tick(now)) this.push(m);
      if (m.phase === "finished") {
        if (this.paidMatches.get(m.id) && this.ledger) {
          this.ledger.settle(m.id, m.rankGroups(), (pid) => this.wallets.get(pid));
        }
        this.paidMatches.delete(m.id);
        m.players.forEach((p) => this.playerMatch.get(p.id) === m.id && this.playerMatch.delete(p.id));
        this.matches.delete(m.id);
      }
    }
  }

  private push(m: Match) {
    this.hooks.emitMatch(m.players.map((p) => p.id), m.snapshot());
  }

  lobbyInfo() {
    return [...this.queues.values()].map((q) => ({ ...q.req, key: q.key, count: q.seats.length }));
  }

  stats() {
    let playing = 0;
    for (const m of this.matches.values()) playing += m.players.length;
    let waiting = 0;
    for (const q of this.queues.values()) waiting += q.seats.length;
    return { playing, waiting, matches: this.matches.size };
  }
}
