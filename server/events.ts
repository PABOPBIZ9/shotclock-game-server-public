/**
 * Freeroll event enrollments (Bomb Pops First Freeze, etc.).
 * Shared across sockets — not per-browser localStorage.
 * Paid tiers stay blocked until PAID_ENTRY_ENABLED + legal.
 */
import { BOMB_POPS_SERIES, isScheduledLive, nextStart, regOpen, type ScheduledEvent } from "../src/shared/schedule";

export type Enrollment = {
  playerId: string;
  handle: string;
  name: string;
  at: number;
};

const byEvent = new Map<string, Map<string, Enrollment>>();

export function eventById(id: string): ScheduledEvent | undefined {
  return BOMB_POPS_SERIES.find((e) => e.id === id);
}

export function listEnrollments(eventId: string): Enrollment[] {
  return [...(byEvent.get(eventId)?.values() ?? [])].sort((a, b) => a.at - b.at);
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
  if (!regOpen(ev, now)) return { ok: false, error: "Registration is closed for this start" };
  const playerId = String(opts.playerId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (!playerId) return { ok: false, error: "Stable player id required" };
  const capacity = ev.practiceField;
  let map = byEvent.get(ev.id);
  if (!map) {
    map = new Map();
    byEvent.set(ev.id, map);
  }
  if (map.has(playerId)) {
    const enrollment = map.get(playerId)!;
    return { ok: true, enrollment, count: map.size, capacity, startAt: nextStart(ev, now) };
  }
  if (map.size >= capacity) return { ok: false, error: "Event is full" };
  const enrollment: Enrollment = {
    playerId,
    handle: String(opts.handle || "").replace(/[^A-Za-z0-9_.]/g, "").slice(0, 18) || "player",
    name: String(opts.name || opts.handle || "Player").slice(0, 24),
    at: now,
  };
  map.set(playerId, enrollment);
  return { ok: true, enrollment, count: map.size, capacity, startAt: nextStart(ev, now) };
}

export function unregisterEvent(eventId: string, playerId: string) {
  const map = byEvent.get(eventId);
  if (!map) return false;
  const ok = map.delete(playerId);
  if (map.size === 0) byEvent.delete(eventId);
  return ok;
}

export function eventSnapshot(eventId: string, now = Date.now()) {
  const ev = eventById(eventId);
  if (!ev) return null;
  const list = listEnrollments(eventId);
  const start = nextStart(ev, now);
  return {
    id: ev.id,
    name: ev.name,
    stake: ev.stake ?? "free",
    deckId: ev.deckId,
    capacity: ev.practiceField,
    count: list.length,
    startAt: Number.isFinite(start) ? start : null,
    lineup: ev.lineup ?? (Number.isFinite(start) ? "live" : "draft"),
    regOpen: regOpen(ev, now),
    enrollments: list.map(({ playerId, handle, name, at }) => ({ playerId, handle, name, at })),
  };
}

export function allBombPopsSnapshots(now = Date.now()) {
  return BOMB_POPS_SERIES.map((e) => eventSnapshot(e.id, now)!);
}
