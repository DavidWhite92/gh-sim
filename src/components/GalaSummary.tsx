"use client";
import { WithdrawalNotice } from "@/components/WithdrawalNotice";

import { RepechageResults } from "@/components/RepechageResults";
import { NOMINATION_NAMES, nominationRules, galaNominationMode } from "@/lib/mechanics";
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
  const hasLeader = !!(gala.events.leader || gala.events.leaderSubtract);

  // Totales parciales según lo revelado
  const partialTotals: Record<string, number> = {};
  for (const id of Object.keys(gala.nominationTotals)) partialTotals[id] = 0;
  for (let i = 0; i < Math.min(revealCount, gala.nominations.length); i++) {
    const n = gala.nominations[i];
    for (const [toId, pts] of Object.entries(n.points)) {
      partialTotals[toId] = (partialTotals[toId] ?? 0) + pts;
    }
  }

  if (showLeaderSave && gala.events.leaderSubtract) {
    const { targetId, after } = gala.events.leaderSubtract;
    partialTotals[targetId] = after;
  }

  const mode = gala.nominationMode ?? galaNominationMode(state, gala.galaNumber);
  const positive = mode === "positive";
  const sorted = Object.entries(partialTotals).sort((a, b) => positive ? a[1] - b[1] : b[1] - a[1]);
  const rules = nominationRules(mode, Object.keys(gala.nominationTotals).length);
  const provisionalSet = new Set(hasLeader && showProvisional ? gala.provisionalNominees : []);

  if (gala.finalStretch) return (
    <section className="card cardPad">
      <h3>Gala {gala.galaNumber} · Recta Final</h3>
      <p>Ya no hay nominaciones entre compañeros. El público vota para salvar: la persona con menor porcentaje será expulsada.</p>
      {gala.events.withdrawal && <WithdrawalNotice state={state} record={gala.events.withdrawal} />}
      {gala.events.repechage && <RepechageResults state={state} record={gala.events.repechage} />}
      <div className="row">{gala.finalNominees.map(id => <span className="badge" key={id}>{idToName.get(id)}</span>)}</div>
    </section>
  );

  return (
    <section className="card cardPad">
      <div className="row">
        <div style={{ fontWeight: 900 }}>Gala {gala.galaNumber} · {gala.nominations.length ? "Nominaciones" : "Resumen"}</div>
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

      {gala.events.withdrawal && (
        <div style={{ marginTop: 14 }}><WithdrawalNotice state={state} record={gala.events.withdrawal} /></div>
      )}
      {gala.events.repechage && (
        <div style={{ marginTop: 14 }}>
          <RepechageResults state={state} record={gala.events.repechage} />
        </div>
      )}

      <div className="row" style={{ marginTop: 10 }}>
        {gala.events.immunity && (
          <span className="badge">
            🛡️ Inmunidad: <b>{idToName.get(gala.events.immunity.winnerId)}</b>
          </span>
        )}
        {gala.events.leader && (
          <span className="badge">
            👑 Líder Salva: <b>{idToName.get(gala.events.leader!.leaderId)}</b>
          </span>
        )}
      </div>

      {gala.events.leaderSubtract && <div className="row" style={{ marginTop: 8 }}>
        <span className="badge">👑 Líder {gala.events.leaderSubtract.after > gala.events.leaderSubtract.before ? "Suma" : "Resta"} {Math.abs(gala.events.leaderSubtract.after - gala.events.leaderSubtract.before)}: <b>{idToName.get(gala.events.leaderSubtract.leaderId)}</b></span>
      </div>}

      <hr className="soft" />

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 900 }}>
          Nominaciones ({Math.min(revealCount, gala.nominations.length)}/{gala.nominations.length})
        </div>

        <div className="muted" style={{ fontSize: 12 }}>
          {NOMINATION_NAMES[mode]}: se dan {rules.points.join(", ")} puntos a {rules.points.length} personas.
          {positive ? " Se apoya primero a los vínculos; quedan nominados quienes reciben menos puntos." : " Si faltan opciones, los vínculos reciben los puntos más bajos posibles."}
        </div>
        {gala.nominations.slice(0, revealCount).map(n => {
          const entries = Object.entries(n.points).sort((a, b) => b[1] - a[1]);
          return (
            <div key={n.fromId} className="badge" style={{ borderRadius: 14 }}>
              <b>{idToName.get(n.fromId)}</b>:{" "}
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
            <span className="muted">(antes de los privilegios)</span>
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

      {gala.events.leaderSubtract && showLeaderSave && <>
        <hr className="soft" />
        <div className="row"><span className="badge">
          El líder {gala.events.leaderSubtract.after > gala.events.leaderSubtract.before ? "suma" : "resta"} {Math.abs(gala.events.leaderSubtract.after - gala.events.leaderSubtract.before)} {Math.abs(gala.events.leaderSubtract.after - gala.events.leaderSubtract.before) === 1 ? "punto" : "puntos"} a <b>{idToName.get(gala.events.leaderSubtract.targetId)}</b>
          {" "}({gala.events.leaderSubtract.before} → {gala.events.leaderSubtract.after}).
          {gala.finalNominees.includes(gala.events.leaderSubtract.targetId) ? " Sigue en la lista de nominados." : " Queda fuera de la lista de nominados."}
        </span></div>
      </>}

      {gala.events.leader && showLeaderSave && (
        <>
          <hr className="soft" />
          <div className="row">
            <span className="badge">
              El Líder Salva salva a <b>{idToName.get(gala.events.leader!.savedId)}</b>
            </span>
          </div>
        </>
      )}

      {showDefinitives && gala.nominations.length > 0 && (
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
