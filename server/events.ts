/**
 * Freeroll event enrollments (Bomb Pops First Freeze, etc.).
 * Shared across sockets — not per-browser localStorage.
 * Paid tiers stay blocked until PAID_ENTRY_ENABLED + legal.
 */
import { BOMB_POPS_SERIES, isScheduledLive, lastStart, lateRegOpen, nextStart, regOpen, startAfter, type ScheduledEvent } from "../src/shared/schedule";

export type Enrollment = {
  playerId: string;
  handle: string;
  name: string;
  at: number;
};

const byInstance = new Map<string, Map<string, Enrollment>>();

function instKey(eventId: string, startAt: number) {
  return `${eventId}@${startAt}`;
}

function mapFor(eventId: string, startAt: number) {
  const k = instKey(eventId, startAt);
  let map = byInstance.get(k);
  if (!map) {
    map = new Map();
    byInstance.set(k, map);
  }
  return map;
}

export function eventById(id: string): ScheduledEvent | undefined {
  return BOMB_POPS_SERIES.find((e) => e.id === id);
}

function currentHeat(ev: ScheduledEvent, now: number): number {
  return lateRegOpen(ev, now) ? lastStart(ev, now) : nextStart(ev, now);
}

/** Open heat: current/upcoming if a seat remains, otherwise the next start (FCFS). */
function openHeat(ev: ScheduledEvent, now: number): { start: number; map: Map<string, Enrollment> } {
  let start = currentHeat(ev, now);
  if (!Number.isFinite(start)) return { start, map: mapFor(ev.id, start) };
  let map = mapFor(ev.id, start);
  if (map.size >= ev.practiceField) {
    start = startAfter(ev, start);
    map = mapFor(ev.id, start);
  }
  return { start, map };
}

export function listEnrollments(eventId: string, startAt?: number): Enrollment[] {
  const ev = eventById(eventId);
  const start = startAt ?? (ev ? openHeat(ev, Date.now()).start : 0);
  return [...(mapFor(eventId, start).values())].sort((a, b) => a.at - b.at);
}

export function registerEvent(opts: {
  eventId: string;
  playerId: string;
  handle: string;
  name: string;
  now?: number;
}): { ok: true; enrollment: Enrollment; count: number; capacity: number; startAt: number } | { ok: false; error: string } {
  const ev = eventById(opts.eventId);
  if (!ev) return { ok: false, error: "Unknown event" };
  if (ev.stake && ev.stake !== "free") {
    return { ok: false, error: "Paid Bomb Pops levels are not open for real registration yet (legal/payments). Join Bomb Pops First Freeze · Freeroll." };
  }
  if (ev.lineup === "draft" || !isScheduledLive(ev)) {
    return { ok: false, error: "This named event is a draft config (unscheduled). Use a live First Freeze freeroll or a fill-to-start table." };
  }
  const now = opts.now ?? Date.now();
  if (!isScheduledLive(ev)) return { ok: false, error: "Registration is closed for this start" };
  const playerId = String(opts.playerId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (!playerId) return { ok: false, error: "Stable player id required" };
  const capacity = ev.practiceField;
  const { start, map } = openHeat(ev, now);
  if (!Number.isFinite(start)) return { ok: false, error: "Registration is closed for this start" };
  if (map.has(playerId)) {
    const enrollment = map.get(playerId)!;
    return { ok: true, enrollment, count: map.size, capacity, startAt: start };
  }
  if (map.size >= capacity) return { ok: false, error: "Event is full" };
  const enrollment: Enrollment = {
    playerId,
    handle: String(opts.handle || "").replace(/[^A-Za-z0-9_.]/g, "").slice(0, 18) || "player",
    name: String(opts.name || opts.handle || "Player").slice(0, 24),
    at: now,
  };
  map.set(playerId, enrollment);
  return { ok: true, enrollment, count: map.size, capacity, startAt: start };
}

export function unregisterEvent(eventId: string, playerId: string) {
  let ok = false;
  for (const [k, map] of byInstance) {
    if (k === eventId || k.startsWith(eventId + "@")) {
      if (map.delete(playerId)) ok = true;
      if (map.size === 0) byInstance.delete(k);
    }
  }
  return ok;
}

export function eventSnapshot(eventId: string, now = Date.now()) {
  const ev = eventById(eventId);
  if (!ev) return null;
  const { start, map } = openHeat(ev, now);
  const list = [...map.values()].sort((a, b) => a.at - b.at);
  return {
    id: ev.id,
    name: ev.name,
    stake: ev.stake ?? "free",
    deckId: ev.deckId,
    capacity: ev.practiceField,
    count: list.length,
    startAt: Number.isFinite(start) ? start : null,
    lineup: ev.lineup ?? (Number.isFinite(start) ? "live" : "draft"),
    regOpen: Number.isFinite(start) && (regOpen(ev, now) || start > now),
    enrollments: list.map(({ playerId, handle, name, at }) => ({ playerId, handle, name, at })),
  };
}

export function allBombPopsSnapshots(now = Date.now()) {
  return BOMB_POPS_SERIES.map((e) => eventSnapshot(e.id, now)!);
}
