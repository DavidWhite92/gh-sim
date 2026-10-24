"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { initGame, playNextGala } from "@/lib/sim";
import { STATUS_COLORS, type GameState } from "@/lib/types";
import { HouseEvents } from "@/components/HouseEvents";
import { PopularityTable } from "@/components/PopularityTable";
import { ResultsTable } from "@/components/ResultsTable";
import { GalaSummary } from "@/components/GalaSummary";

const REVEAL_LINES = [
  "LA AUDIENCIA...",
  "HA DECIDIDO...",
  "QUE DEBE...",
  "ABANDONAR...",
  "LA CASA...",
];

const FINAL_THIRD_LINES = [
  "LA AUDIENCIA...",
  "HA DECIDIDO...",
  "QUE EL/LA...",
  "TERCER FINALISTA...",
  "SEA...",
];

const FINAL_WIN_LINES = [
  "LA AUDIENCIA...",
  "HA DECIDIDO...",
  "QUE EL/LA GANADOR/A",
  "DE GRAN HERMANO...",
  "SEA...",
];

function fullSentence() {
  return "La audiencia ha decidido que debe abandonar la casa";
}



export default function SimulatorClient() {
  const params = useSearchParams();
  const router = useRouter();

  const setup = params.get("setup");
  const initial = useMemo(() => {
    if (!setup) return null;
    try {
      const parsed = JSON.parse(decodeURIComponent(setup));
      return initGame((parsed.contestants ?? parsed.names) as any, parsed.seed);
    } catch {
      return null;
    }
  }, [setup]);

  const [state, setState] = useState<GameState | null>(initial);



  useEffect(() => {
    if (initial) setState(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup]);

  // Expulsión reveal
  const [evictStep, setEvictStep] = useState(0); // 0..5 text, 5 name, 6 done
  const [evictDoneForGala, setEvictDoneForGala] = useState<number | null>(null);
// Final reveal (3º y ganador)
  const [finalPhase, setFinalPhase] = useState<"third" | "winner" | "done">("third");
  const [finalStep, setFinalStep] = useState(0); // 0..5 lines, 5 name, 6 done for phase
  const [finalDoneForGala, setFinalDoneForGala] = useState<number | null>(null);


  // Nominaciones reveal
  const [revealNomCount, setRevealNomCount] = useState(0);
  const [showDefinitives, setShowDefinitives] = useState(false);
  const [showLeaderSave, setShowLeaderSave] = useState(false);

  const [eventsSeen, setEventsSeen] = useState(true);
  const [showPopularity, setShowPopularity] = useState(false);

  // Table gating
  const [showTable, setShowTable] = useState(false);

  // Revisión de galas (evita spoilers: solo permite galas ya “cerradas”)
  const [reviewGalaNumber, setReviewGalaNumber] = useState<number | null>(null);

  if (!state) {
    return (
      <section className="card cardPad">
        <div className="row">
          <div style={{ fontWeight: 900 }}>No hay configuración</div>
          <div className="spacer" />
          <button className="btn" onClick={() => router.push("/")}>Volver</button>
        </div>
      </section>
    );
  }

  const alphabeticalContestants = [...state.contestants].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );
  const idToName = new Map(state.contestants.map(c => [c.id, c.name]));

  // Galas “revisables”: solo las que ya han llegado a mostrar tabla (evita spoilers)
  const completedGalaCount = Math.max(0, state.galas.length - (showTable ? 0 : 1));
  const reviewableGalas = useMemo(() => {
    // state.galas guarda registros reales (en este simulador empiezan en Gala 2).
    // Mostramos solo las galas ya cerradas y a partir de la 2.
    return state.galas.slice(0, completedGalaCount).filter(g => g.galaNumber >= 2);
  }, [state.galas, completedGalaCount]);

  const reviewableGalaNumbers = useMemo(() => {
    return reviewableGalas.map(g => g.galaNumber);
  }, [reviewableGalas]);

  useEffect(() => {
    if (reviewGalaNumber != null && !reviewableGalaNumbers.includes(reviewGalaNumber)) setReviewGalaNumber(null);
  }, [reviewGalaNumber, reviewableGalaNumbers]);

  const idToContestant = new Map(state.contestants.map(c => [c.id, c]));
  const getPhotoUrl = (id: string) => {
    const c = idToContestant.get(id);
    if (!c) return "";
    if (c.photoUrl) return c.photoUrl;
    // fallback por convención /<seasonId>/<slug>.jpg
    const seasonId = (c.seasonId ?? "").trim();
    if (!seasonId) return "";
    const slug = c.name
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return `/${seasonId}/${slug}.jpg`;
  };

  const lastVote: any = (state.publicVotes ?? [])[state.publicVotes.length - 1];
  const lastGala = state.galas[state.galas.length - 1];

  const lastEvictionGala = (state as any).lastEvictionGala as number | null;
  const isEvictionToReveal =
    !!lastVote &&
    (lastVote.kind ?? "eviction") === "eviction" &&
    lastVote.galaNumber === lastEvictionGala &&
    lastVote.galaNumber !== 1 &&
    evictDoneForGala !== lastVote.galaNumber;

  const isFinalVoteToReveal =
    !!lastVote &&
    (lastVote.kind ?? "eviction") === "final" &&
    finalDoneForGala !== lastVote.galaNumber;

  const winnerAnnounced = lastVote?.kind === "final" && (
    (finalPhase === "winner" && finalStep >= 5) ||
    finalPhase === "done" ||
    finalDoneForGala === lastVote.galaNumber
  );

  const isFinalReady = (state as any).finalReady && !((state as any).finished);

  // Eliminados para la UI: durante el reveal NO ponemos gris al expulsado hasta que salga su nombre en pantalla
  const displayEliminated = useMemo(() => {
    const set = new Set(state.eliminatedIds);
    const vote: any = (state.publicVotes ?? [])[state.publicVotes.length - 1];
    if (!vote) return set;

    // expulsión normal
    if (isEvictionToReveal && evictStep < 5 && vote.kind !== "final") {
      set.delete(vote.expelledId);
    }

    // La final conserva a los tres en color hasta anunciar al ganador.
    if (vote.kind === "final" && state.finalRanking) {
      const { winnerId, secondId, thirdId } = state.finalRanking;
      set.delete(winnerId);
      if (winnerAnnounced) {
        set.add(secondId);
        set.add(thirdId);
      } else {
        set.delete(secondId);
        set.delete(thirdId);
      }
    }
    return set;
  }, [state.eliminatedIds, state.publicVotes, state.finalRanking, isEvictionToReveal, evictStep, winnerAnnounced]);
  const isFinalFinished = !!((state as any).finished);

  // En la gala tras última expulsión, no hay nominaciones: solo finalistas
  const finalists = (state as any).finalists as string[] | undefined;

  const onCelebrate = () => {
    setEventsSeen(false);
    setShowPopularity(false);
    // reset pasos UI
    setEvictStep(0);
    setRevealNomCount(0);
    setShowDefinitives(false);
    setShowLeaderSave(false);
    setShowTable(false);
    setFinalPhase("third");
    setFinalStep(0);
    setFinalDoneForGala(null);

    const next = playNextGala(state);
    setState(next);
  };

  // Control de revelado de nominaciones
  const hasNomsThisGala = !!lastGala && lastGala.galaNumber === (state.gala - 1) && lastGala.nominations.length > 0;
  const totalNoms = hasNomsThisGala ? lastGala!.nominations.length : 0;

  const hasLeaderThisGala = !!lastGala?.events.leader;

  const canShowProvisional = hasLeaderThisGala && revealNomCount >= totalNoms;
  const canShowLeaderSave = hasLeaderThisGala && canShowProvisional; // se muestra tras provisionales (no decimos arriba)
  const canShowDefinitives = revealNomCount >= totalNoms && (!hasLeaderThisGala || showLeaderSave);

  const revealNominations = (count: number) => {
    if (!eventsSeen || !hasNomsThisGala || isEvictionToReveal || isFinalVoteToReveal) return;
    const nextCount = Math.min(totalNoms, count);
    setRevealNomCount(nextCount);
    if (nextCount >= totalNoms && !hasLeaderThisGala) {
      setShowDefinitives(true);
      setShowTable(true);
    }
  };
  // Botón celebrar solo cuando ya se han revelado definitivos (o cuando toca final)
  const canCelebrate =
    eventsSeen && !isFinalFinished && !isEvictionToReveal && !isFinalVoteToReveal &&
    (
      (isFinalReady && !isEvictionToReveal && !isFinalVoteToReveal) ||
      (hasNomsThisGala && canShowDefinitives && showTable) ||
      (!hasNomsThisGala && !isEvictionToReveal && !isFinalReady)
    );

  // state.gala representa la *siguiente* gala a celebrar (puntero interno).
  // Para el usuario mostramos la última gala "en curso" (state.gala - 1).
  const topTitle = isFinalFinished && winnerAnnounced
    ? "Concurso finalizado"
    : (isFinalReady || isFinalVoteToReveal
      ? "Final"
      : (state.gala === 1 ? "Gala 1: Entrada a la casa" : `Gala actual: ${Math.max(1, state.gala - 1)}`));

  return (
    <>

      {/* ROSTER adaptable (fotos de 62x62). Gris solo cuando corresponde */}
      <section className="card cardPad simulatorRoster" style={{ paddingTop: 10, paddingBottom: 10 }}>
        <div className="row" style={{ alignItems: "baseline" }}>
          <div style={{ fontWeight: 900 }}>Roster</div>
          <div className="muted" style={{ marginLeft: 10 }}>Fotos arriba (gris si expulsado)</div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            paddingTop: 10,
            paddingBottom: 4,
          }}
        >
          {alphabeticalContestants.map(c => {
            const isGrey = displayEliminated.has(c.id);
            const src = getPhotoUrl(c.id);
            const timeline = state.timeline[c.id] ?? [];
            // Conserva los nominados de la votación pendiente hasta revelar al expulsado.
            const pendingEvictionNominee =
              isEvictionToReveal && evictStep < 5 && lastVote.nominees.includes(c.id);
            const pendingFinalist =
              isFinalVoteToReveal && !winnerAnnounced && lastVote.nominees.includes(c.id);
            const status = !isGrey
              ? (pendingFinalist ? "Finalista" : showTable ? timeline[timeline.length - 1] : pendingEvictionNominee ? "Nominado" : undefined)
              : undefined;
            const frameColor = status === "Nominado" || status === "Nominada"
              ? STATUS_COLORS.Nominado
              : status === "Finalista" ? STATUS_COLORS.Finalista : undefined;
            return (
              <div key={c.id} style={{ width: 62, flex: "0 0 auto" }}>
                <div
                  style={{
                    position: "relative",
                    width: 62,
                    height: 62,
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "#f3f3f3",
                    border: "1px solid rgba(0,0,0,0.08)",
                    filter: isGrey ? "grayscale(1)" : "none",
                    opacity: isGrey ? 0.7 : 1,
                  }}
                  title={frameColor ? `${c.name} · ${status}` : c.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={c.name}
                    width={62}
                    height={62}
                    style={{ width: 62, height: 62, objectFit: "cover" }}
                    onError={(e) => {
                      // fallback a png si venía jpg
                      const img = e.currentTarget;
                      if ((img as any).dataset?.fallbackApplied) return;
                      (img as any).dataset.fallbackApplied = "1";
                      if (src?.toLowerCase().endsWith(".jpg")) img.src = src.replace(/\.jpg$/i, ".png");
                    }}
                  />
                  {frameColor && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "inherit",
                        boxShadow: `inset 0 0 0 4px ${frameColor}`,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

{/* Selector de galas (solo galas finalizadas / con tabla revelada) */}
{reviewableGalaNumbers.length > 0 && (
  <section className="card cardPad" style={{ paddingTop: 10, paddingBottom: 10 }}>
    <div className="row" style={{ alignItems: "baseline", flexWrap: "wrap", gap: 10 }}>
      <div style={{ fontWeight: 900 }}>Revisar gala</div>
      <div className="muted">Pulsa un número para mostrar/ocultar el resumen</div>
    </div>

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      {reviewableGalaNumbers.map((n) => {
        const active = reviewGalaNumber === n;
        return (
          <button
            key={n}
            className={"btn" + (active ? " btnPrimary" : "")}
            onClick={() => setReviewGalaNumber((prev) => (prev === n ? null : n))}
          >
            Gala {n}
          </button>
        );
      })}
    </div>

    {reviewGalaNumber != null && (
      <div style={{ marginTop: 12 }}>
        {(() => {
          const galaToShow = state.galas.find(g => g.galaNumber === reviewGalaNumber);
          if (!galaToShow) return null;
          return (
            <GalaSummary
              state={state}
              gala={galaToShow}
              revealCount={galaToShow.nominations.length}
              onNextReveal={() => {}}
              showProvisional={true}
              showLeaderSave={true}
              showDefinitives={true}
              showTable={true}
              readOnly
            />
          );
        })()}
      </div>
    )}
  </section>
)}
      <section className="card cardPad">
        <div className="row">
          <div style={{ fontWeight: 900 }}>{topTitle}</div>
          <span className="badge">Activos: <b>{state.activeIds.length}</b></span>

          <div className="spacer" />

          {canCelebrate && (
            <button className="btn btnPrimary" onClick={onCelebrate}>
              {isFinalReady ? "Celebrar final" : "Celebrar gala"}
            </button>
          )}
          <button className="btn" onClick={() => router.push("/")}>Reiniciar</button>
        </div>

        {state.gala === 1 && (
          <>
            <hr className="soft" />
            <div className="row">
              <div style={{ fontWeight: 900 }}>Entran en la casa</div>
              <span className="muted">Las nominaciones empiezan en la Gala 2</span>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              {state.contestants.map(c => (
                <span key={c.id} className="badge">👤 <b>{c.name}</b></span>
              ))}
            </div>
          </>
        )}

        {/* Nominados pendientes (solo se muestra si ya se revelaron definitivos) */}
        {showDefinitives && state.pendingNominees.length > 0 && !isFinalReady && !isFinalFinished && (
          <>
            <hr className="soft" />
            <div className="row">
              <div style={{ fontWeight: 900 }}>Nominados (pasan a votación)</div>
              <span className="muted">Se expulsa en la próxima gala</span>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              {state.pendingNominees.map(id => (
                <span key={id} className="badge">🔸 <b>{idToName.get(id)}</b></span>
              ))}
            </div>
          </>
        )}
      </section>

      {state.houseRounds.length > 0 && (
        <HouseEvents
          state={state}
          round={state.houseRounds[state.houseRounds.length - 1]}
          onContinue={eventsSeen ? undefined : () => setEventsSeen(true)}
        />
      )}

      {/* REVEAL EXPULSIÓN */}
      {eventsSeen && isEvictionToReveal && (
        <section className="card cardPad" style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 1 }}>
            {evictStep < 5
              ? REVEAL_LINES[evictStep]
              : (idToName.get(lastVote.expelledId) ?? "EXPULSADO")}
          </div>

          <div className="row" style={{ justifyContent: "center", marginTop: 14 }}>
            <button
              className="btn btnPrimary"
              onClick={() => {
                if (evictStep < 5) setEvictStep(s => s + 1);
                else {
                  setEvictDoneForGala(lastVote.galaNumber);
                  setEvictStep(6);
                  // tras revelar la expulsión, solo mostramos la tabla si esta expulsión deja la final preparada
                  if (isFinalReady) setShowTable(true);
                }
              }}
            >
              {evictStep < 5 ? "Siguiente" : "Continuar"}
            </button>
          </div>
        </section>
      )}

      {/* Tras revelar expulsión, mostramos la frase completa + nombre */}
      {lastVote && (lastVote.kind ?? "eviction") === "eviction" && evictDoneForGala === lastVote.galaNumber && (
        <section className="card cardPad" style={{ textAlign: "center" }}>
          <div className="muted" style={{ fontSize: 14, marginBottom: 6 }}>{fullSentence()}</div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>{idToName.get(lastVote.expelledId)}</div>

          {/* Si esta expulsión deja 3, mostramos finalistas */}
          {isFinalReady && finalists?.length === 3 && (
            <>
              <hr className="soft" />
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Finalistas</div>
              <div className="row" style={{ justifyContent: "center" }}>
                {finalists.map(id => (
                  <span key={id} className="badge">🏁 <b>{idToName.get(id)}</b></span>
                ))}
              </div>
            </>
          )}
        </section>
      )}


      {/* REVEAL FINAL (3º y ganador) */}
      {eventsSeen && isFinalVoteToReveal && (
        <section className="card cardPad" style={{ textAlign: "center" }}>
          {(() => {
            const thirdId = lastVote.expelledId as string;
            const winnerId = (lastVote.nominees as string[])
              .slice()
              .sort((a: string, b: string) => (lastVote.percents[b] ?? 0) - (lastVote.percents[a] ?? 0))[0];

            const lines = finalPhase === "third" ? FINAL_THIRD_LINES : FINAL_WIN_LINES;
            const nameToShow = finalPhase === "third" ? thirdId : winnerId;

            return (
              <>
                <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 1 }}>
                  {finalStep < 5 ? lines[finalStep] : (idToName.get(nameToShow) ?? "")}
                </div>

                <div className="row" style={{ justifyContent: "center", marginTop: 14 }}>
                  <button
                    className="btn btnPrimary"
                    onClick={() => {
                      if (finalStep < 5) setFinalStep(s => s + 1);
                      else {
                        if (finalPhase === "third") {
                          setFinalPhase("winner");
                          setFinalStep(0);
                        } else {
                          setFinalPhase("done");
                          setFinalDoneForGala(lastVote.galaNumber);
                          setShowTable(true);
                        }
                      }
                    }}
                  >
                    {finalStep < 5 ? "Siguiente" : (finalPhase === "third" ? "Continuar" : "Ver resultado")}
                  </button>
                </div>
              </>
            );
          })()}
        </section>
      )}

      {/* Tras revelar final, mostramos la tabla final */}
      {lastVote && (lastVote.kind ?? "eviction") === "final" && finalDoneForGala === lastVote.galaNumber && (
        <section className="card cardPad" style={{ textAlign: "center" }}>
          <div className="muted" style={{ fontSize: 14, marginBottom: 6 }}>Resultado final</div>
          <div className="row" style={{ justifyContent: "center" }}>
            {(() => {
              const ranked = (lastVote.nominees as string[])
                .slice()
                .sort((a: string, b: string) => (lastVote.percents[b] ?? 0) - (lastVote.percents[a] ?? 0));
              return ranked.map((id: string, i: number) => (
                <span key={id} className="badge">
                  {i === 0 ? "🏆" : i === 1 ? "🥈" : "🥉"} <b>{idToName.get(id)}</b>
                </span>
              ));
            })()}
          </div>
        </section>
      )}

      {/* NOMINACIONES: solo si hay gala record y ya no estamos bloqueados por expulsión */}
      {eventsSeen && hasNomsThisGala && !isEvictionToReveal && !isFinalVoteToReveal && (
        <GalaSummary
          state={state}
          gala={lastGala!}
          revealCount={revealNomCount}
          onNextReveal={() => revealNominations(revealNomCount + 1)}
          onRevealAll={() => revealNominations(totalNoms)}
          showProvisional={canShowProvisional}
          showLeaderSave={showLeaderSave}
          showDefinitives={showDefinitives}
          showTable={showTable}
        />
      )}

      {/* Botón para confirmar salvación del líder y mostrar definitivos */}
      {eventsSeen && hasNomsThisGala && hasLeaderThisGala && !isEvictionToReveal && revealNomCount >= totalNoms && !showLeaderSave && (
        <section className="card cardPad">
          <div className="row">
            <div style={{ fontWeight: 900 }}>Acción del líder</div>
            <div className="spacer" />
            <button
              className="btn btnPrimary"
              onClick={() => {
                setShowLeaderSave(true);
                setShowDefinitives(true);
                setShowTable(true);
              }}
            >
              Revelar a quién salva
            </button>
          </div>
          <div className="muted" style={{ marginTop: 8 }}>
            Tras mostrar la salvación se revelan los nominados definitivos.
          </div>
        </section>
      )}

      {/* TABLA: solo cuando ya se revelaron los definitivos */}
      {showTable && (
        <>
          {isFinalFinished && finalDoneForGala === lastVote?.galaNumber && (
            <div className="row">
              <button className="btn" onClick={() => setShowPopularity(value => !value)}>
                {showPopularity ? "Tabla de Recorrido" : "Tabla de Popularidad"}
              </button>
            </div>
          )}
          {showPopularity && isFinalFinished
            ? <PopularityTable state={state} />
            : <ResultsTable state={state} />}
        </>
      )}
    </>
  );
}