import type { GameState, HouseEvent, Relationships } from "./types";
import { shuffle } from "./rng";

export function ensureRelationships(state: GameState) {
  state.relationships ??= {};
  for (const a of state.contestants) {
    state.relationships[a.id] ??= {};
    for (const b of state.contestants) if (a.id !== b.id) state.relationships[a.id][b.id] ??= 50;
  }
}

export function relationshipScore(relations: Relationships | undefined, a: string, b: string) {
  return relations?.[a]?.[b] ?? 50;
}

export function rankRelations(ids: string[], fromId: string, relations: Relationships | undefined, best: boolean, rand: () => number) {
  return shuffle(ids, rand).sort((a, b) => (best ? -1 : 1) * (relationshipScore(relations, fromId, a) - relationshipScore(relations, fromId, b)));
}

export function updateRelationships(state: GameState, event: HouseEvent) {
  ensureRelationships(state);
  event.relationshipChanges = [];
  // Pactos: acuerdo temporal, sin alterar por sí solos la afinidad acumulada.
  if (event.effect === "pact" || event.participantIds.length < 2) return;
  const negative = event.conflict || event.effect === "breakup";
  if (!negative && !event.positive && !event.effect) return;
  const impact = Math.max(3, Math.round(event.changes.reduce((sum, change) => sum + Math.abs(change.delta), 0) / event.changes.length));
  const magnitude = Math.min(25, impact + (event.effect === "couple" || event.effect === "breakup" ? 8 : event.effect === "romance" ? 5 : 0));
  for (let i = 0; i < event.participantIds.length; i++) {
    for (const b of event.participantIds.slice(i + 1)) {
      const a = event.participantIds[i];
      const before = relationshipScore(state.relationships, a, b);
      const after = Math.max(0, Math.min(100, before + (negative ? -magnitude : magnitude)));
      state.relationships[a][b] = state.relationships[b][a] = after;
      event.relationshipChanges.push({ a, b, before, after, delta: after - before });
    }
  }
}
