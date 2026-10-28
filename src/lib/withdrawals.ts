import type { GameState, WithdrawalRecord } from "./types";
import { pickOne } from "./rng";

export function withdrawalChance(previousCount: number) {
  return previousCount >= 3 ? 0 : 0.03 / (2 ** previousCount);
}

export function applyWithdrawal(state: GameState, phase: WithdrawalRecord["phase"], rand: () => number, followedId?: string) {
  if (state.activeIds.length <= 5 || !state.withdrawalsEnabled || !state.reserves.length || state.withdrawals.length >= 3) return;
  let candidates = state.activeIds.filter(id =>
    !(phase === "before" && state.pendingNominees.length === 2 && state.pendingNominees.includes(id)));
  if (!candidates.length) return;
  if (phase === "after" && followedId) {
    const closeIds = new Set([
      ...state.couples.filter(pair => pair.includes(followedId)).flat(),
      ...state.houseRounds[state.houseRounds.length - 1].events
        .filter(event => ["connection", "romance", "couple"].includes(event.effect ?? "") && event.participantIds.includes(followedId))
        .flatMap(event => event.participantIds),
    ]);
    // Un vínculo cercano aumenta la probabilidad de querer marcharse con quien sale.
    candidates = candidates.flatMap(id => Array(closeIds.has(id) ? 6 : 1).fill(id));
  }
  const departedId = pickOne(candidates, rand);
  const replacement = pickOne(state.reserves, rand);
  state.reserves = state.reserves.filter(c => c.id !== replacement.id);
  state.activeIds = state.activeIds.filter(id => id !== departedId);
  state.eliminatedIds.push(departedId);
  state.pendingNominees = state.pendingNominees.filter(id => id !== departedId);
  state.timeline[departedId][state.gala - 1] = "Abandono";
  state.contestants.push(replacement);
  state.activeIds.push(replacement.id);
  state.popularity[replacement.id] = 50;
  state.timeline[replacement.id] = Array(state.gala).fill("");
  state.timeline[replacement.id][state.gala - 1] = "Entra";
  const record: WithdrawalRecord = { galaNumber: state.gala, phase, departedId, replacementId: replacement.id, followedId };
  state.withdrawals.push(record);
  return record;
}
