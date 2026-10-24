"use client";

import { GalaRecord, GameState } from "@/lib/types";

export function GalaSummary({
  state,
  gala,
  revealCount,
  onNextReveal,
  onRevealAll,
  showDefinitives,
  showTable,
  showProvisional,
  showLeaderSave,
  readOnly,
}: {
  state: GameState;
  gala: GalaRecord;
  revealCount: number;
  onNextReveal: () => void;
  onRevealAll?: () => void;
  showDefinitives: boolean;
  showTable: boolean;
  showProvisional: boolean;
  showLeaderSave: boolean;
  readOnly?: boolean;
}) {
  const idToName = new Map(state.contestants.map(c => [c.id, c.name]));
  const hasLeader = !!gala.events.leader;

  // Totales parciales según lo revelado
  const partialTotals: Record<string, number> = {};
  for (const id of state.activeIds) partialTotals[id] = 0;
  for (let i = 0; i < Math.min(revealCount, gala.nominations.length); i++) {
    const n = gala.nominations[i];
    for (const [toId, pts] of Object.entries(n.points)) {
      partialTotals[toId] = (partialTotals[toId] ?? 0) + pts;
    }
  }

  // provisionales dinámicos por puntos (solo visual), incluyendo empates en el corte
  const sorted = Object.entries(partialTotals).sort((a, b) => b[1] - a[1]);
  const min = state.activeIds.length === 4 ? 2 : 3;

  let provisionalDynamic: string[] = [];
  if (sorted.length > 0) {
    if (sorted.length < min) {
      provisionalDynamic = sorted.map(x => x[0]);
    } else {
      const cutoff = sorted[min - 1][1];
      // si el corte es 0 (aún no hay votos suficientes), evitamos marcar a todos
      if (cutoff <= 0) {
        provisionalDynamic = sorted.slice(0, min).map(x => x[0]);
      } else {
        provisionalDynamic = sorted.filter(([, pts]) => pts >= cutoff).map(x => x[0]);
      }
    }
  }
  const provisionalSet = new Set(provisionalDynamic);

  return (
    <section className="card cardPad">
      <div className="row">
        <div style={{ fontWeight: 900 }}>Gala {gala.galaNumber} · Nominaciones</div>
        <span className="badge muted">Los provisionales solo aparecen si hay líder</span>
        <div className="spacer" />
        {!readOnly && revealCount < gala.nominations.length && (
          <>
            <button className="btn" onClick={onNextReveal}>
              Siguiente
            </button>
            {onRevealAll && (
              <button className="btn" onClick={onRevealAll}>
                Revelar todo
              </button>
            )}
          </>
        )}
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        {gala.events.immunity && (
          <span className="badge">
            🛡️ Inmunidad: <b>{idToName.get(gala.events.immunity.winnerId)}</b>
          </span>
        )}
        {hasLeader && (
          <span className="badge">
            👑 Líder: <b>{idToName.get(gala.events.leader!.leaderId)}</b>
          </span>
        )}
      </div>

      <hr className="soft" />

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 900 }}>
          Nominaciones ({Math.min(revealCount, gala.nominations.length)}/{gala.nominations.length})
        </div>

        <div className="muted" style={{ fontSize: 12 }}>
          Las parejas, conexiones y pactos se respetan. Si faltan objetivos disponibles, se reparten menos votos.
        </div>
        {gala.nominations.slice(0, revealCount).map(n => {
          const entries = Object.entries(n.points).sort((a, b) => b[1] - a[1]);
          return (
            <div key={n.fromId} className="badge" style={{ borderRadius: 14 }}>
              <b>{idToName.get(n.fromId)}</b>:{" "}
              {entries.length === 0 && <span>Sin votos: sus vínculos protegen a los participantes disponibles.</span>}
              {entries.map(([toId, pts], i) => (
                <span key={toId}>
                  {i > 0 ? " · " : ""}
                  {idToName.get(toId)} ({pts})
                </span>
              ))}
            </div>
          );
        })}
      </div>

      <hr className="soft" />
      <div className="row">
        <div style={{ fontWeight: 900 }}>Conteo total</div>
        <span className="muted">(se actualiza mientras revelas nominaciones)</span>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        {sorted.map(([id, pts]) => (
          <span
            key={id}
            className="badge"
            style={{
              borderColor: provisionalSet.has(id) ? "rgba(255,80,80,.55)" : undefined,
              background: provisionalSet.has(id) ? "rgba(255,80,80,.10)" : undefined,
            }}
          >
            <b>{idToName.get(id)}</b> {pts}
          </span>
        ))}
      </div>

      {hasLeader && showProvisional && (
        <>
          <hr className="soft" />
          <div className="row">
            <div style={{ fontWeight: 900 }}>Nominados provisionales</div>
            <span className="muted">(antes de la salvación)</span>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            {gala.provisionalNominees.map(id => (
              <span key={id} className="badge" style={{ borderColor: "rgba(255,80,80,.55)", background: "rgba(255,80,80,.10)" }}>
                🔸 <b>{idToName.get(id)}</b>
              </span>
            ))}
          </div>
        </>
      )}

      {hasLeader && showLeaderSave && (
        <>
          <hr className="soft" />
          <div className="row">
            <span className="badge">
              El líder salva a <b>{idToName.get(gala.events.leader!.savedId)}</b>
            </span>
          </div>
        </>
      )}

      {showDefinitives && (
        <>
          <hr className="soft" />
          <div className="row">
            <div style={{ fontWeight: 900 }}>Nominados definitivos</div>
            <span className="muted">(los que pasan a votación)</span>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            {gala.finalNominees.map(id => (
              <span key={id} className="badge">
                🔸 <b>{idToName.get(id)}</b>
              </span>
            ))}
          </div>
        </>
      )}

      {!showTable && (
        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          La tabla se mostrará cuando se revelen los nominados definitivos.
        </div>
      )}
    </section>
  );
}
