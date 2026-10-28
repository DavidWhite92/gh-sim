import { galaNominationMode } from "./mechanics";
import type { GameState, HouseEvent, HouseRound } from "./types";
import { shuffle } from "./rng";

import { templates } from "./houseEventCatalog";
import { moreEvents } from "./moreEvents";

export function generateHouseRound(state: GameState, rand: () => number): HouseRound {
  const count = 4 + Math.floor(rand() * 5);
  state.couples = (state.couples ?? []).filter(pair => pair.every(id => state.activeIds.includes(id)));
  const recentTitles = new Set(state.houseRounds.slice(-3).flatMap(round => round.events.map(event => event.title)));
  const seenTitles = new Set(state.houseRounds.flatMap(round => round.events.map(event => event.title)));
  const available = shuffle([...templates, ...moreEvents].filter(t => t.min <= state.activeIds.length), rand)
    .sort((a, b) => (recentTitles.has(a.title) ? 2 : seenTitles.has(a.title) ? 1 : 0)
      - (recentTitles.has(b.title) ? 2 : seenTitles.has(b.title) ? 1 : 0));
  const events: HouseEvent[] = [];
  const romanticChanges = new Set<string>();
  for (const template of available) {
    if (events.length === count) break;
    let participantIds: string[];
    if (template.effect === "breakup") {
      const pairs = state.couples.filter(pair => pair.every(id => !romanticChanges.has(id)));
      if (!pairs.length) continue;
      participantIds = [...shuffle(pairs, rand)[0]];
      state.couples = state.couples.filter(pair => !pair.every(id => participantIds.includes(id)));
      participantIds.forEach(id => romanticChanges.add(id));
    } else if (template.effect === "couple" || template.effect === "romance") {
      const partnered = new Set(state.couples.flat());
      const singles = state.activeIds.filter(id => !partnered.has(id) && !romanticChanges.has(id));
      if (singles.length < 2) continue;
      participantIds = shuffle(singles, rand).slice(0, 2);
      participantIds.forEach(id => romanticChanges.add(id));
      if (template.effect === "couple") state.couples.push([participantIds[0], participantIds[1]]);
    } else {
      if (template.effect === "pact" && events.some(event => event.effect === "pact")) continue;
      // No nuevo vínculo temporal para quienes acaban de romper.
      const candidates = template.effect === "connection"
        ? state.activeIds.filter(id => !romanticChanges.has(id))
        : state.activeIds;
      if (candidates.length < template.min) continue;
      const max = Math.min(template.max, candidates.length);
      const size = template.min + Math.floor(rand() * (max - template.min + 1));
      participantIds = shuffle(candidates, rand).slice(0, size);
      if (template.effect === "connection") participantIds.forEach(id => romanticChanges.add(id));
    }
    const changes = participantIds.map(id => {
      const before = state.popularity[id];
      const delta = template.impact[0] + Math.floor(rand() * (template.impact[1] - template.impact[0] + 1));
      const after = Math.max(0, Math.min(100, before + delta));
      state.popularity[id] = after;
      return { id, before, after, delta: after - before };
    });
    events.push({ title: template.title, description: template.description, participantIds, changes,
      positive: template.impact[0] > 0, conflict: !!template.conflict, effect: template.effect });
  }
  return { finalStretch: state.finalStretchActive, nominationMode: galaNominationMode(state), galaNumber: state.gala, events, popularity: { ...state.popularity },
    activeIds: [...state.activeIds], couples: state.couples.map(pair => [...pair] as [string, string]) };
}

export function protectedPairs(state: GameState, events: HouseEvent[]): string[][] {
  return [
    ...(state.couples ?? []),
    ...events.filter(event => ["connection", "romance", "pact"].includes(event.effect ?? "")).map(event => event.participantIds),
  ];
}

/** Completa todos los votos: objetivos comunes primero, vínculos solo como último recurso. */
export function buildNominations(state: GameState, scheme: number[], immuneId: string | undefined, events: HouseEvent[], rand: () => number, excludedIds: string[] = []) {
  const activeIds = state.activeIds.filter(id => !excludedIds.includes(id));
  const groups = protectedPairs(state, events);
  if (galaNominationMode(state) === "positive") {
    return shuffle(activeIds, rand).map(fromId => {
      const eligible = activeIds.filter(id => id !== fromId && id !== immuneId);
      const friends = eligible.filter(id => groups.some(group => group.includes(fromId) && group.includes(id)));
      const rivals = new Set(events.filter(e => e.conflict && e.participantIds.includes(fromId)).flatMap(e => e.participantIds));
      const others = eligible.filter(id => !friends.includes(id));
      // Afinidad primero, neutrales después y conflictos al final. Los puntos mayores van primero.
      const targets = [...shuffle(friends, rand), ...shuffle(others.filter(id => !rivals.has(id)), rand),
        ...shuffle(others.filter(id => rivals.has(id)), rand)].slice(0, scheme.length);
      if (targets.length !== scheme.length) throw new Error("No hay suficientes objetivos para votar en positivo.");
      return { fromId, points: Object.fromEntries(targets.map((id, i) => [id, scheme[i]])) };
    });
  }
  const eligibleFor = (fromId: string) => activeIds.filter(id =>
    id !== fromId && id !== immuneId && !groups.some(group => group.includes(fromId) && group.includes(id)));
  const pactTargets = new Map<string, string[]>();
  for (const event of events.filter(event => event.effect === "pact")) {
    const members = event.participantIds.filter(id => activeIds.includes(id));
    if (!members.length) continue;
    const common = activeIds.filter(id => members.every(member => eligibleFor(member).includes(id)));
    // Tiene en cuenta los conflictos de cualquiera de los miembros para elegir los objetivos.
    const sharedConflicts = events.filter(e => e.conflict && e.participantIds.some(id => members.includes(id)))
      .map(e => ({ ...e, participantIds: [...new Set([...e.participantIds, members[0]])] }));
    const targets = nominationTargets(members[0], common, scheme.length, sharedConflicts, rand);
    for (const member of members) pactTargets.set(member, targets);
  }
  return shuffle(activeIds, rand).map(fromId => {
    const agreed = pactTargets.get(fromId);
    const targets = agreed ? shuffle(agreed, rand) : [];
    const unprotected = eligibleFor(fromId).filter(id => !targets.includes(id));
    targets.push(...nominationTargets(fromId, unprotected, scheme.length - targets.length, events, rand));
    // Completa siempre la papeleta: los vínculos reciben los puntos más bajos.
    const protectedTargets = activeIds.filter(id =>
      id !== fromId && id !== immuneId && !targets.includes(id));
    targets.push(...nominationTargets(fromId, protectedTargets, scheme.length - targets.length, events, rand));
    if (targets.length !== scheme.length) throw new Error("No hay suficientes objetivos válidos para completar la nominación.");
    return { fromId, points: Object.fromEntries(targets.map((id, i) => [id, scheme[i]])) };
  });
}
/** Popularity changes the odds, never guarantees a result. The final is a vote to win. */
export function audiencePercents(ids: string[], popularity: Record<string, number>, rand: () => number, final = false) {
  // El apoyo acumulado pesa más; el azar acotado permite sorpresas entre apoyos cercanos.
  const weights = ids.map(id => (0.5 + rand()) * Math.exp((final ? 1 : -1) * ((popularity[id] ?? 50) - 50) / 22));
  const sum = weights.reduce((a, b) => a + b, 0);
  const units = weights.map(weight => weight / sum * 1000);
  const rounded = units.map(Math.floor);
  const remainderOrder = ids.map((_, i) => i).sort((a, b) => (units[b] - rounded[b]) - (units[a] - rounded[a]));
  for (let i = 0, remaining = 1000 - rounded.reduce((a, b) => a + b, 0); i < remaining; i++) rounded[remainderOrder[i]]++;
  return Object.fromEntries(ids.map((id, i) => [id, rounded[i] / 10]));
}

export function nominationTargets(fromId: string, eligible: string[], count: number, events: HouseEvent[], rand: () => number) {
  const rivals = new Set(events.filter(e => e.conflict && e.participantIds.includes(fromId)).flatMap(e => e.participantIds));
  const pool = [...eligible];
  const chosen: string[] = [];
  while (chosen.length < count && pool.length) {
    const weights = pool.map(id => rivals.has(id) ? 8 : 1);
    let ticket = rand() * weights.reduce((a, b) => a + b, 0);
    let index = 0;
    while (index < pool.length - 1 && ticket >= weights[index]) ticket -= weights[index++];
    chosen.push(pool.splice(index, 1)[0]);
  }
  return chosen;
}
