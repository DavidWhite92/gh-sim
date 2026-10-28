import type { GameOptions, GameState, NominationMode, PrivilegePolicy } from "./types";
import { mulberry32, pickOne } from "./rng";

export const NOMINATION_NAMES: Record<NominationMode, string> = {
  traditional: "Tradicional", gh24: "GH2–GH4", gh1: "GH1", positive: "Positivo", randomPositive: "Positivo Aleatorio",
};

export function resolveMechanics(options: GameOptions, seed: number) {
  const rand = mulberry32(seed + 450007);
  const leaderMode = options.leaderMode === "subtract3" || options.leaderMode === "subtract1" ? options.leaderMode : "save";
  const leaderPolicy = options.leaderPolicy === "always" || options.leaderPolicy === "never" ? options.leaderPolicy : "random";
  const restrictModes = leaderMode === "subtract3" && leaderPolicy !== "never";
  if (restrictModes && (options.nominationMode === "gh1" || options.nominationMode === "gh24")) {
    throw new Error("Líder Resta 3 no es compatible con GH1 ni GH2–GH4.");
  }
  const modes: NominationMode[] = restrictModes ? ["traditional", "positive"] : ["traditional", "gh24", "gh1", "positive"];
  const nominationMode = options.nominationMode === "random" ? pickOne(modes, rand)
    : options.nominationMode === "randomPositive" ? "randomPositive" : modes.includes(options.nominationMode as NominationMode) ? options.nominationMode as NominationMode : "traditional";
  const finalSize: 3 | 4 = options.finalSize === "random" ? (rand() < 0.5 ? 3 : 4) : options.finalSize === 4 ? 4 : 3;
  const policy = (value?: PrivilegePolicy): PrivilegePolicy => value === "always" || value === "never" ? value : "random";
  return { nominationMode, finalSize, leaderPolicy, leaderMode, immunityPolicy: policy(options.immunityPolicy) };
}

export function nominationRules(mode: NominationMode, activeCount: number) {
  if (mode === "gh1") return { points: [1, 1], min: 2 };
  if (mode === "gh24") return { points: [1, 1, 1], min: 3 };
  if (mode === "traditional" && activeCount === 4) return { points: [2, 1], min: 2 };
  return { points: [3, 2, 1], min: 3 };
}

/** A seeded, independent draw fixes the voting direction for the whole gala. */
export function galaNominationMode(state: Pick<GameState, "nominationMode" | "seed" | "gala">, galaNumber = state.gala): NominationMode {
  if (state.nominationMode !== "randomPositive") return state.nominationMode;
  return mulberry32(state.seed + galaNumber * 104729 + 632333)() < 0.15 ? "positive" : "traditional";
}
