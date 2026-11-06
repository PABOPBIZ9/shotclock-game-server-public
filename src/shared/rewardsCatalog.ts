/**
 * Soft Points catalogs — safe for server + client.
 * Never imports React / localStorage.
 */
import { PRACTICE_CHIP_GRANT } from "@/lib/practiceChips";

export const DAILY_FREE_SPINS = 3;
export const WELCOME_BONUS_SPINS = 1;

export type SpinPrize = { id: string; label: string; fpp: number; chips?: number; weight: number };

/** Soft Points — promotional only. Tuned ~2.5× prior soft-launch values. */
export const SPIN_PRIZES: SpinPrize[] = [
  { id: "15", label: "15 Points", fpp: 15, weight: 327 },
  { id: "25", label: "25 Points", fpp: 25, weight: 248 },
  { id: "40", label: "40 Points", fpp: 40, weight: 170 },
  { id: "65", label: "65 Points", fpp: 65, weight: 125 },
  { id: "90", label: "90 Points", fpp: 90, weight: 68 },
  { id: "125", label: "125 Points", fpp: 125, weight: 39 },
  { id: "250", label: "250 Points", fpp: 250, weight: 15 },
  { id: "625", label: "625 Points", fpp: 625, weight: 5 },
  { id: "875", label: "875 Points + 350 chips", fpp: 875, chips: PRACTICE_CHIP_GRANT, weight: 2 },
  { id: "2500", label: "2,500 Points", fpp: 2500, weight: 1 },
];

export type QuestId = "spin" | "share" | "invite" | "freeroll" | "follow" | "survey";
export type QuestDef = { id: QuestId; title: string; blurb: string; fpp: number; href?: string; icon: string };

export const DAILY_QUESTS: QuestDef[] = [
  { id: "spin", title: "Daily Spin", blurb: "Use one free spin on the wheel.", fpp: 40, href: "/spin", icon: "bolt" },
  { id: "share", title: "Save your share card", blurb: "Grab your /username card with invite link.", fpp: 50, href: "/profile#share", icon: "share" },
  { id: "invite", title: "Bring a friend", blurb: "A friend joins with your /username link.", fpp: 125, href: "/profile", icon: "users" },
  { id: "freeroll", title: "Play a freeroll", blurb: "Finish any free Bomb Pops / practice table.", fpp: 65, href: "/#lobby", icon: "play" },
  { id: "follow", title: "Follow SHOTCLOCK", blurb: "Tap Follow on X, TikTok, Instagram or YouTube.", fpp: 40, href: "/quests#follow", icon: "heart" },
  { id: "survey", title: "Quick survey", blurb: "Answer today's study pulse (3 taps).", fpp: 50, href: "/quests#survey", icon: "check" },
];

export const QUEST_CHEST_FPP = 190;
