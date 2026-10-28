import { resolveMechanics, nominationRules, galaNominationMode } from "./mechanics";
import { applyWithdrawal, withdrawalChance } from "./withdrawals";
import { generateHouseRound, audiencePercents, buildNominations } from "./popularity";
import { GameState, Status, GalaRecord, ContestantInput, ContestantSetup, Gender, GameOptions } from "./types";
import { mulberry32, pickOne } from "./rng";

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

function computeNomineesByPoints(totals: Record<string, number>, minCount: number, positive = false): string[] {
  const sorted = Object.entries(totals).sort((a, b) => positive ? a[1] - b[1] : b[1] - a[1]);
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

export function initGame(inputs: ContestantInput[], seed = Date.now(), options: GameOptions = {}): GameState {
  const normalized = normalizeInputs(inputs);
  if (options.finalStretch && normalized.length < 14) throw new Error("Recta Final requiere al menos 14 concursantes.");

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

  const occupied = new Set(normalized.map(c => `${c.seasonId ?? ""}::${c.name}`));
  const reserves = (options.reserves ?? []).filter(c => {
    const key = `${c.seasonId ?? ""}::${c.name}`;
    if (occupied.has(key)) return false;
    occupied.add(key);
    return true;
  }).slice(0, 10).map((c, i) => ({
    ...c, id: `r${i}_${slugify(c.name)}`, gender: normalizeGender(c.gender),
  }));

  const activeIds = contestants.map(c => c.id);
  const timeline: GameState["timeline"] = {};
  for (const c of contestants) timeline[c.id] = [];

  const mechanics = resolveMechanics(options, seed);
  const hasRepechage = options.repechage === true || (options.repechage === "random" && mulberry32(seed + 812399)() < 0.5);
  const state: GameState = {
    ...mechanics,
    finalStretchAt: options.finalStretch ? mechanics.finalSize + 1 + Math.floor(mulberry32(seed + 339119)() * (8 - mechanics.finalSize)) : undefined,
    finalStretchActive: false,
    pendingVoteToSave: false,
    repechageAfterEvictions: hasRepechage && contestants.length >= 10
      ? 4 + Math.floor(mulberry32(seed + 71891)() * (Math.min(8, contestants.length - 6) - 3))
      : undefined,
    withdrawalsEnabled: options.withdrawals === true,
    reserves,
    withdrawals: [],
    seed,
    gala: 1,
    contestants,
    activeIds,
    eliminatedIds: [],
    timeline,
    popularity: Object.fromEntries(activeIds.map(id => [id, 50])),
    houseRounds: [],
    couples: [],
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

  const houseRound = generateHouseRound(state, rand);
  state.houseRounds.push(houseRound);

  // FINAL (si ya estaba lista)
  if ((state as any).finalReady && state.activeIds.length === state.finalSize) {
    // Votación final (una sola, la UI revela 3º y ganador)
    const finalPercents = audiencePercents(state.activeIds, state.popularity, rand, true);
    const ranked = Object.entries(finalPercents).sort((a, b) => b[1] - a[1]);

    const winnerId = ranked[0][0];
    const secondId = ranked[1][0];
    const thirdId = ranked[2][0];
    const fourthId = ranked[3]?.[0];

    state.publicVotes.push({
      galaNumber: state.gala,
      nominees: [...state.activeIds],
      percents: finalPercents,
      expelledId: fourthId ?? thirdId,
      kind: "final",
    } as any);

    // Columna "Final" (una única columna extra)
    ensureTimelineColumns(state, state.gala + 1);
    const finalColIndex0 = state.gala;

    setStatusForGala(state, winnerId, finalColIndex0, "Ganador");
    setStatusForGala(state, secondId, finalColIndex0, "Segundo");
    setStatusForGala(state, thirdId, finalColIndex0, "Tercero");

    if (fourthId) setStatusForGala(state, fourthId, finalColIndex0, "Cuarto");
    state.finalRanking = { winnerId, secondId, thirdId, ...(fourthId ? { fourthId } : {}) };
    (state as any).finished = true;
    (state as any).finalReady = false;
    return state;
  }

  // Una tirada por gala, sin afectar al azar del resto cuando están desactivados.
  const withdrawalRand = mulberry32(state.seed + state.gala * 87071 + 39013);
  let withdrawalPhase: "before" | "after" | undefined;
  if (state.activeIds.length > 5 && state.withdrawalsEnabled && state.reserves.length && withdrawalRand() < withdrawalChance(state.withdrawals.length)) {
    withdrawalPhase = state.pendingNominees.length > 0 && withdrawalRand() < 0.5 ? "after" : "before";
  }
  if (withdrawalPhase === "before") applyWithdrawal(state, "before", withdrawalRand);

  // 1) Expulsión (si hay nominados pendientes)
  if (state.pendingNominees.length > 0) {
    const voteToSave = state.pendingVoteToSave;
    const percents = audiencePercents(state.pendingNominees, state.popularity, rand, voteToSave);
    const expelledId = Object.entries(percents).sort((a, b) => voteToSave ? a[1] - b[1] : b[1] - a[1])[0][0];

    state.publicVotes.push({
      galaNumber: state.gala,
      nominees: [...state.pendingNominees],
      percents,
      expelledId,
      kind: "eviction",
      voteToSave,
    } as any);

    (state as any).lastEvictionGala = state.gala;

    state.eliminatedIds.push(expelledId);
    state.activeIds = state.activeIds.filter(id => id !== expelledId);

    setStatusForGala(state, expelledId, galaIndex0, "Expulsado");
    state.pendingNominees = [];
    state.pendingVoteToSave = false;

    if (withdrawalPhase === "after") applyWithdrawal(state, "after", withdrawalRand, expelledId);

    // Una sola repesca, después de la expulsión y antes de las nominaciones.
    if (!state.repechage && state.repechageAfterEvictions === state.publicVotes.filter(v => v.kind === "eviction").length && state.activeIds.length >= 6) {
      const candidateIds = state.eliminatedIds.filter(id => id !== expelledId && !state.withdrawals.some(w => w.departedId === id));
      const returnPercents = audiencePercents(candidateIds, state.popularity, rand, true);
      const returnedId = [...candidateIds].sort((a, b) => returnPercents[b] - returnPercents[a])[0];
      state.repechage = {
        galaNumber: state.gala,
        evictionNumber: state.publicVotes.filter(v => v.kind === "eviction").length,
        candidateIds,
        percents: returnPercents,
        returnedId,
      };
      state.eliminatedIds = state.eliminatedIds.filter(id => id !== returnedId);
      state.activeIds.push(returnedId);
      setStatusForGala(state, returnedId, galaIndex0, "Repesca");
    }

    // Si tras expulsión quedan 3: esta gala SOLO expulsa y declara finalistas.
    if (state.activeIds.length === state.finalSize) {
      for (const id of state.activeIds) setStatusForGala(state, id, galaIndex0, "Finalista");
      (state as any).finalReady = true;
      (state as any).finalists = [...state.activeIds];
      const withdrawal = state.withdrawals.find(w => w.galaNumber === state.gala);
      if (withdrawal) state.galas.push({
        galaNumber: state.gala, nominations: [], nominationTotals: {},
        provisionalNominees: [], finalNominees: [], events: { withdrawal },
      });
      state.gala += 1;
      return state;
    }
  }

  // 2) Nominaciones (si quedan >=4)
  if (state.activeIds.length > state.finalSize) {
    const nominationMode = galaNominationMode(state);
    const { points: scheme, min } = nominationRules(nominationMode, state.activeIds.length);

    const returning = state.repechage?.galaNumber === state.gala ? state.repechage : undefined;
    const withdrawal = state.withdrawals.find(w => w.galaNumber === state.gala);
    const excludedIds = [
      ...(returning ? [returning.returnedId] : []),
      ...(withdrawal ? [withdrawal.replacementId] : []),
    ];
    const eligibleIds = state.activeIds.filter(id => !excludedIds.includes(id));
    const events: GalaRecord["events"] = { ...(returning ? { repechage: returning } : {}), ...(withdrawal ? { withdrawal } : {}) };

    if (state.finalStretchActive || (state.finalStretchAt !== undefined && state.activeIds.length <= state.finalStretchAt)) {
      state.finalStretchActive = true;
      houseRound.finalStretch = true;
      // Se mantienen las exenciones de llegada durante esa gala.
      for (const id of eligibleIds) setStatusForGala(state, id, galaIndex0, "NominadoPublico");
      state.pendingNominees = [...eligibleIds];
      state.pendingVoteToSave = true;
      state.galas.push({
        galaNumber: state.gala, finalStretch: true, nominations: [], nominationTotals: {},
        provisionalNominees: [], finalNominees: [...eligibleIds], events,
      });
      state.gala += 1;
      return state;
    }

    // Inmunidad aleatoria
    // Regla: no puede haber inmunidad cuando solo quedan 4 concursantes.
    const IMMUNITY_P = 0.22;
    const positive = nominationMode === "positive";
    let immuneId: string | undefined;
    if (state.activeIds.length > 5 && eligibleIds.length >= scheme.length + 2 && state.immunityPolicy !== "never" && (state.immunityPolicy === "always" || rand() < IMMUNITY_P)) {
      immuneId = pickOne(eligibleIds, rand);
      events.immunity = { winnerId: immuneId };
      setStatusForGala(state, immuneId, galaIndex0, "Exento");
    }

    const nominations = buildNominations(state, scheme, immuneId, houseRound.events, rand, excludedIds);
    const totals: Record<string, number> = {};
    for (const targetId of state.activeIds) totals[targetId] = 0;
    for (const nom of nominations) {
      for (const [toId, pts] of Object.entries(nom.points)) totals[toId] += pts;
    }
    const provisional = computeNomineesByPoints(Object.fromEntries(Object.entries(totals).filter(([id]) => id !== immuneId && !excludedIds.includes(id))), min, positive);

    // Líder: salva a uno de los provisionales
    const LEADER_P = 0.22;
    let finalNominees = [...provisional];

    if (state.leaderPolicy !== "never" && (state.leaderPolicy === "always" || rand() < LEADER_P) && provisional.length > 0) {
      const leaderId = pickOne(eligibleIds, rand);
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
      if (positive) {
        // En positivo se salva a quien se apoya más, o a sí mismo si está en riesgo.
        const mostSupported = Math.max(...provisional.map(id => leaderGiven[id] ?? 0));
        savedId = leaderIsProvisional && rand() < 0.7 ? leaderId
          : pickOne(provisional.filter(id => (leaderGiven[id] ?? 0) === mostSupported), rand);
      } else if (leaderIsProvisional) {
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
      const sorted = Object.entries(totals).filter(([id]) => id !== immuneId && !excludedIds.includes(id)).sort((a, b) => positive ? a[1] - b[1] : b[1] - a[1]);
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
      nominationMode,
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
