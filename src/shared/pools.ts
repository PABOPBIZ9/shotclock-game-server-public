import { PLAYER_POOL_BPS } from "@/shared/config";
import { stakeById } from "@/shared/stakes";

/** Estimated prize pool if the table fills (capacity × buy-in × 88.89%; freerolls pay points). */
export function poolOf(id: string, size: number): { amount: string; unit: string; raw: number } {
  const st = stakeById(id.split("@")[1] ?? "free");
  if (st.sol === 0) { const raw = Math.max(500, size * 50); return { amount: raw.toLocaleString(), unit: "pts", raw }; }
  const raw = Math.round(size * st.sol * (PLAYER_POOL_BPS / 10_000) * 1000) / 1000;
  return { amount: String(raw), unit: "SOL", raw };
}
