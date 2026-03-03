import { GameState, Status, GalaRecord, ContestantInput, ContestantSetup, Gender } from "./types";
import { mulberry32, pickOne, shuffle } from "./rng";

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeInputs(inputs: ContestantInput[]): ContestantSetup[] {
  return inputs.map((x) => {
    if (typeof x === "string") return { name: x };
    return x;
  });
}

function normalizeGender(g?: Gender): Gender {
  return g === "M" || g === "F" || g === "X" ? g : "X";
}


function ensureTimelineColumns(state: GameState, totalColumns: number) {
  for (const c of state.contestants) {
    if (!state.timeline[c.id]) state.timeline[c.id] = [];
    while (state.timeline[c.id].length < totalColumns) state.timeline[c.id].push("" as any);
  }
}

function setStatusForGala(state: GameState, contestantId: string, galaIndex0: number, status: Status) {
  state.timeline[contestantId][galaIndex0] = status;
}

function sumTo100Percents(ids: string[], rand: () => number): Record<string, number> {
  const weights = ids.map(() => 0.2 + rand() * 1.8);
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map(w => (w / sum) * 100);

  const out: Record<string, number> = {};
  let acc = 0;
  for (let i = 0; i < ids.length; i++) {
    const v = i === ids.length - 1 ? (100 - acc) : Math.round(raw[i] * 10) / 10;
    out[ids[i]] = v;
    acc += v;
  }
  out[ids[ids.length - 1]] = Math.round(out[ids[ids.length - 1]] * 10) / 10;
  return out;
}

function getMinNominees(activeCount: number) {
  if (activeCount === 4) return { points: [2, 1], min: 2 };
  return { points: [3, 2, 1], min: 3 };
}

function computeNomineesByPoints(totals: Record<string, number>, minCount: number): string[] {
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return [];

  const picked: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    picked.push(sorted[i][0]);
    if (picked.length >= minCount) {
      const cutoffPoints = sorted[i][1];
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j][1] === cutoffPoints) picked.push(sorted[j][0]);
        else break;
      }
      break;
    }
  }
  return picked;
}

function autoNominate(fromId: string, eligibleTargets: string[], pointsScheme: number[], rand: () => number) {
  const targets = shuffle(eligibleTargets, rand).slice(0, pointsScheme.length);
  const points: Record<string, number> = {};
  for (let i = 0; i < targets.length; i++) points[targets[i]] = pointsScheme[i];
  return { fromId, points };
}

export function initGame(inputs: ContestantInput[], seed = Date.now()): GameState {
  const normalized = normalizeInputs(inputs);

  const contestants = normalized.map((c, idx) => {
    const safe = slugify(c.name);
    return {
      id: `c${idx}_${safe}`,
      name: c.name,
      seasonId: c.seasonId,
      photoUrl: c.photoUrl,
      gender: normalizeGender(c.gender),
    };
  });

  const activeIds = contestants.map(c => c.id);
  const timeline: GameState["timeline"] = {};
  for (const c of contestants) timeline[c.id] = [];

  const state: GameState = {
    seed,
    gala: 1,
    contestants,
    activeIds,
    eliminatedIds: [],
    timeline,
    pendingNominees: [],
    galas: [],
    publicVotes: [],
    finished: false,

    // extensiones opcionales
    finalReady: false,
    finalists: [],
    lastEvictionGala: null,
  } as any;

  ensureTimelineColumns(state, 1);
  for (const id of state.activeIds) setStatusForGala(state, id, 0, "Entra");
  return state;
}

export function playNextGala(prev: GameState): GameState {
  if ((prev as any).finished) return prev;

  const state: GameState = structuredClone(prev);

  // La Gala 1 es solo "entrada a la casa" (sin nominaciones/expulsión).
  // Para evitar una "gala vacía" en la UI, cuando se celebra la Gala 1
  // avanzamos inmediatamente a la Gala 2 y ejecutamos sus nominaciones en la
  // misma llamada.
  if (state.gala === 1) {
    state.gala = 2;
  }

  const rand = mulberry32(state.seed + state.gala * 99991);

  const galaIndex0 = state.gala - 1;
  ensureTimelineColumns(state, state.gala);

  // FINAL (si ya estaba lista)
  if ((state as any).finalReady && state.activeIds.length === 3) {
    // Votación final (una sola, la UI revela 3º y ganador)
    const finalPercents = sumTo100Percents(state.activeIds, rand);
    const ranked = Object.entries(finalPercents).sort((a, b) => b[1] - a[1]);

    const winnerId = ranked[0][0];
    const secondId = ranked[1][0];
    const thirdId = ranked[2][0];

    state.publicVotes.push({
      galaNumber: state.gala,
      nominees: [...state.activeIds],
      percents: finalPercents,
      expelledId: thirdId,
      kind: "final",
    } as any);

    // Columna "Final" (una única columna extra)
    ensureTimelineColumns(state, state.gala + 1);
    const finalColIndex0 = state.gala;

    setStatusForGala(state, winnerId, finalColIndex0, "Ganador");
    setStatusForGala(state, secondId, finalColIndex0, "Segundo");
    setStatusForGala(state, thirdId, finalColIndex0, "Tercero");

    (state as any).finalRanking = { winnerId, secondId, thirdId };
    (state as any).finished = true;
    (state as any).finalReady = false;
    return state;
  }

  // 1) Expulsión (si hay nominados pendientes)
  if (state.pendingNominees.length > 0) {
    const percents = sumTo100Percents(state.pendingNominees, rand);
    const expelledId = Object.entries(percents).sort((a, b) => b[1] - a[1])[0][0];

    state.publicVotes.push({
      galaNumber: state.gala,
      nominees: [...state.pendingNominees],
      percents,
      expelledId,
      kind: "eviction",
    } as any);

    (state as any).lastEvictionGala = state.gala;

    state.eliminatedIds.push(expelledId);
    state.activeIds = state.activeIds.filter(id => id !== expelledId);

    setStatusForGala(state, expelledId, galaIndex0, "Expulsado");
    state.pendingNominees = [];

    // Si tras expulsión quedan 3: esta gala SOLO expulsa y declara finalistas.
    if (state.activeIds.length === 3) {
      for (const id of state.activeIds) setStatusForGala(state, id, galaIndex0, "Finalista");
      (state as any).finalReady = true;
      (state as any).finalists = [...state.activeIds];
      state.gala += 1;
      return state;
    }
  }

  // 2) Nominaciones (si quedan >=4)
  if (state.activeIds.length >= 4) {
    const { points: scheme, min } = getMinNominees(state.activeIds.length);

    const events: GalaRecord["events"] = {};

    // Inmunidad aleatoria
    // Regla: no puede haber inmunidad cuando solo quedan 4 concursantes.
    const IMMUNITY_P = 0.22;
    let immuneId: string | undefined;
    if (state.activeIds.length > 4 && rand() < IMMUNITY_P) {
      immuneId = pickOne(state.activeIds, rand);
      events.immunity = { winnerId: immuneId };
      setStatusForGala(state, immuneId, galaIndex0, "Exento");
    }

    const nominations: GalaRecord["nominations"] = [];
    const totals: Record<string, number> = {};
    for (const targetId of state.activeIds) totals[targetId] = 0;

    for (const fromId of state.activeIds) {
      const eligibleTargets = state.activeIds.filter(id => id !== fromId && id !== immuneId);
      const nom = autoNominate(fromId, eligibleTargets, scheme, rand);
      nominations.push(nom);
      for (const [toId, pts] of Object.entries(nom.points)) totals[toId] += pts;
    }

    const provisional = computeNomineesByPoints(totals, min);

    // Líder: salva a uno de los provisionales
    const LEADER_P = 0.22;
    let finalNominees = [...provisional];

    if (rand() < LEADER_P && provisional.length > 0) {
      const leaderId = pickOne(state.activeIds, rand);
      const leaderNom = nominations.find(n => n.fromId === leaderId);
      const leaderGiven = leaderNom?.points ?? {};

      // Regla "Salvación del líder":
      // - No puede salvar a alguien que haya nominado.
      // - Si casualmente ha nominado a TODOS los provisionales,
      //   salva al que menos puntos le haya dado (típicamente 1 punto).
      // - Si el líder está provisionalmente nominado con un porcentaje/"peso" muy alto,
      //   se prioriza que se salve a sí mismo (no siempre, pero es muy probable).

      const leaderIsProvisional = provisional.includes(leaderId);
      // Heurística de "porcentaje alto": si el líder es de los más puntuados entre los provisionales.
      const provisionalSorted = [...provisional].sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0));
      const leaderRank = provisionalSorted.indexOf(leaderId); // 0 = más alto
      const leaderHighRisk = leaderIsProvisional && leaderRank >= 0 && leaderRank <= 0; // top 1
      const leaderMedRisk = leaderIsProvisional && leaderRank >= 0 && leaderRank <= 1; // top 2

      // Candidatos que el líder NO ha nominado
      const notNominatedByLeader = provisional.filter(id => !(id in leaderGiven));

      let savedId: string;

      // Prioriza auto-salvarse si está nominado con riesgo alto
      if (leaderIsProvisional) {
        const pSelf = leaderHighRisk ? 0.9 : leaderMedRisk ? 0.7 : 0.55;
        if (rand() < pSelf) {
          savedId = leaderId;
        } else {
          // Si no se salva, debe respetar la regla de no salvar a alguien que nominó
          if (notNominatedByLeader.length > 0) {
            savedId = pickOne(notNominatedByLeader, rand);
          } else {
            // Ha nominado a TODOS los provisionales: salva al que menos puntos dio
            let minPts = Infinity;
            let mins: string[] = [];
            for (const id of provisional) {
              const pts = leaderGiven[id] ?? Infinity;
              if (pts < minPts) {
                minPts = pts;
                mins = [id];
              } else if (pts === minPts) {
                mins.push(id);
              }
            }
            savedId = pickOne(mins.length ? mins : provisional, rand);
          }
        }
      } else {
        // El líder NO está nominado: salva a alguien que no haya nominado.
        if (notNominatedByLeader.length > 0) {
          savedId = pickOne(notNominatedByLeader, rand);
        } else {
          // Caso raro: ha nominado a todos los provisionales
          let minPts = Infinity;
          let mins: string[] = [];
          for (const id of provisional) {
            const pts = leaderGiven[id] ?? Infinity;
            if (pts < minPts) {
              minPts = pts;
              mins = [id];
            } else if (pts === minPts) {
              mins.push(id);
            }
          }
          savedId = pickOne(mins.length ? mins : provisional, rand);
        }
      }

      events.leader = { leaderId, savedId };

      finalNominees = provisional.filter(id => id !== savedId);

      // rellenar hasta mínimo con siguiente por puntos (+empates)
      const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
      const already = new Set(finalNominees);
      already.add(savedId);

      while (finalNominees.length < min) {
        const next = sorted.find(([id]) => !already.has(id));
        if (!next) break;
        const cutoffPts = next[1];
        for (const [id, pts] of sorted) {
          if (pts === cutoffPts && !already.has(id)) {
            finalNominees.push(id);
            already.add(id);
          }
        }
      }

      // marca al salvado
      if (state.activeIds.includes(savedId)) setStatusForGala(state, savedId, galaIndex0, "Salvado");
    }

    // Pintar estado de todos en esta gala
    for (const id of state.activeIds) {
      const current = state.timeline[id][galaIndex0] as Status | undefined;
      if (finalNominees.includes(id)) setStatusForGala(state, id, galaIndex0, "Nominado");
      else if (!current || (current as any) === "") setStatusForGala(state, id, galaIndex0, "Salvado");
    }

    const galaRecord: GalaRecord = {
      galaNumber: state.gala,
      nominations,
      nominationTotals: totals,
      provisionalNominees: provisional,
      finalNominees,
      events,
    };

    state.galas.push(galaRecord);
    state.pendingNominees = finalNominees;
  }

  state.gala += 1;
  return state;
}
