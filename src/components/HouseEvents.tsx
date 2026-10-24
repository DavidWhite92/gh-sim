import type { GameState, HouseRound } from "@/lib/types";

export function HouseEvents({ state, round, onContinue }: { state: GameState; round: HouseRound; onContinue?: () => void }) {
  const names = new Map(state.contestants.map(c => [c.id, c.name]));
  return (
    <section className="card cardPad">
      <div className="row">
        <h2 style={{ fontSize: 18, margin: 0 }}>En la casa · Gala {round.galaNumber}</h2>
        <span className="badge">Popularidad del público · 0–100</span>
      </div>
      <p className="muted">Lo ocurrido en la casa cambia la opinión del público. Todos comenzaron con 50 puntos.</p>
      <div style={{ display: "grid", gap: 12 }}>
        {round.events.map((event, index) => (
          <article key={index} className="houseEvent" style={{ borderLeftColor: event.positive ? "#36a879" : "#d58363" }}>
            <strong>{event.positive ? "↑" : "↓"} {event.title}</strong>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{event.participantIds.map(id => names.get(id)).join(" · ")}</div>
            <p style={{ margin: "6px 0 10px", lineHeight: 1.5 }}>{event.description}</p>
            <div className="row">
              {event.changes.map(change => (
                <span className="badge" key={change.id}>
                  {names.get(change.id)}: {change.before} → <b>{change.after}</b> ({change.delta > 0 ? "+" : ""}{change.delta})
                </span>
              ))}
            </div>
            {event.conflict && <p className="muted" style={{ marginBottom: 0 }}>Esta discusión aumenta la probabilidad de que se nominen entre sí en esta gala.</p>}
          </article>
        ))}
      </div>
      {onContinue && <button className="btn btnPrimary" style={{ marginTop: 14 }} onClick={onContinue}>Continuar gala</button>}
    </section>
  );
}
