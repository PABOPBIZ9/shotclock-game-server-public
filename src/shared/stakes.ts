/** Launch stake ladder (Hybrid economy). One clear price per table. */
export type StakeId = "free" | "micro" | "low" | "mid" | "degen" | "whale";
export interface Stake { id: StakeId; label: string; sol: number; color: string; fpp: number }
export const STAKES: readonly Stake[] = [
  { id: "free", label: "Freeroll", sol: 0, color: "#137A3B", fpp: 1 },
  { id: "micro", label: "Micro", sol: 0.035, color: "#2B5BFF", fpp: 1.5 },
  { id: "low", label: "Low", sol: 0.088, color: "#1F3FB8", fpp: 2 },
  { id: "mid", label: "Mid", sol: 0.35, color: "#7C3AED", fpp: 3 },
  { id: "degen", label: "Degen", sol: 0.88, color: "#D7263D", fpp: 4 },
  { id: "whale", label: "Whale", sol: 3.5, color: "#1E3FAE", fpp: 6 },
];
export const stakeById = (id: string) => STAKES.find((s) => s.id === id) ?? STAKES[0];
export const fmtSol = (n: number) => `${n < 0.1 ? n.toFixed(3) : n < 1 ? n.toFixed(2) : n.toFixed(2)} SOL`;
/** "Freeroll" or "0.035 SOL" — never mixed currencies. */
export const stakePrice = (s: Stake) => (s.sol === 0 ? "Freeroll" : fmtSol(s.sol));
