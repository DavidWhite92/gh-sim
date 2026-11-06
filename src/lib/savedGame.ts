import type { GameState } from "./types";

export type RevealProgress = {
  withdrawalStep: number; repechageStep: number; evictStep: number;
  evictDoneForGala: number | null; finalPhase: "fourth" | "third" | "winner" | "done";
  finalStep: number; finalDoneForGala: number | null; revealNomCount: number;
  showDefinitives: boolean; showLeaderSave: boolean; eventsSeen: boolean;
  resultView: "journey" | "popularity" | "relationships"; showTable: boolean;
  reviewGalaNumber: number | null;
};
export type SavedGame = { version: 1; state: GameState; progress: RevealProgress };
export const SAVE_CODE = /^[A-Z0-9]{8}$/;
export function isSavedGame(value: unknown): value is SavedGame {
  if (!value || typeof value !== "object") return false;
  const v = value as SavedGame, s = v.state, p = v.progress;
  if (v.version !== 1 || !s || !p || !Number.isFinite(s.seed) || !Number.isInteger(s.gala) || s.gala < 1 || ![3,4].includes(s.finalSize)) return false;
  for (const key of ["contestants", "reserves", "activeIds", "eliminatedIds", "galas", "publicVotes", "houseRounds", "withdrawals", "couples"] as const) if (!Array.isArray(s[key])) return false;
  if (!s.contestants.length || !s.contestants.every(c => typeof c.id === "string" && typeof c.name === "string")) return false;
  if (!s.timeline || !s.popularity || !s.relationships || !Array.isArray(s.pendingNominees)) return false;
  for (const key of ["withdrawalStep", "repechageStep", "evictStep", "finalStep", "revealNomCount"] as const) if (!Number.isInteger(p[key]) || p[key] < 0) return false;
  if (p.withdrawalStep > 2 || p.repechageStep > 2 || p.evictStep > 6 || p.finalStep > 6 || p.revealNomCount > s.contestants.length) return false;
  for (const key of ["evictDoneForGala", "finalDoneForGala", "reviewGalaNumber"] as const) if (p[key] !== null && (!Number.isInteger(p[key]) || p[key]! < 1)) return false;
  for (const key of ["showDefinitives", "showLeaderSave", "eventsSeen", "showTable"] as const) if (typeof p[key] !== "boolean") return false;
  return ["fourth","third","winner","done"].includes(p.finalPhase) && ["journey","popularity","relationships"].includes(p.resultView);
}

export async function fetchSavedGame(code: string, signal?: AbortSignal): Promise<SavedGame> {
  const normalized = code.trim().toUpperCase();
  if (!SAVE_CODE.test(normalized)) throw new Error("Introduce un código de 8 letras y números.");
  const response = await fetch(`/api/saves/${normalized}`, { cache: "no-store", signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo cargar la partida.");
  if (!isSavedGame(result)) throw new Error("La partida no es compatible con esta versión.");
  return result;
}
