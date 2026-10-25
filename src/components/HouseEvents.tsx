import type { GameState, HouseRound } from "@/lib/types";

export function HouseEvents({ state, round, onContinue }: { state: GameState; round: HouseRound; onContinue?: () => void }) {
  const names = new Map(state.contestants.map(c => [c.id, c.name]));
  return (
    <section className="card cardPad">
      <div className="row">
        <h2 style={{ fontSize: 18, margin: 0 }}>En la casa · Gala {round.galaNumber}</h2>
      </div>
      <p className="muted">Lo ocurrido en la casa cambia la opinión del público.</p>
      <div style={{ display: "grid", gap: 12 }}>
        {round.events.map((event, index) => (
          <article key={index} className="houseEvent" style={{ borderLeftColor: event.positive ? "#36a879" : "#d58363" }}>
            <strong>{event.positive ? "↑" : "↓"} {event.title}</strong>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{event.participantIds.map(id => names.get(id)).join(" · ")}</div>
            <p style={{ margin: "6px 0 10px", lineHeight: 1.5 }}>{event.description}</p>
            {event.conflict && <p className="muted" style={{ marginBottom: 0 }}>Esta discusión aumenta la probabilidad de que se nominen entre sí, salvo que les proteja una conexión, pareja o pacto.</p>}
            {event.effect === "pact" && <p className="muted">Pacto de esta gala: comparten objetivos siempre que haya suficientes. Si faltan nombres, completan los votos y reservan los puntos más bajos para sus vínculos.</p>}
            {(event.effect === "connection" || event.effect === "romance") && <p className="muted">Se evitarán en esta gala. Solo se nominarán si faltan opciones, con los puntos más bajos posibles.</p>}
            {event.effect === "couple" && <p className="muted">Pareja: se evitarán mientras sigan juntos. Si es imprescindible completar la nominación, se darán los puntos más bajos posibles.</p>}
            {event.effect === "breakup" && <p className="muted">La protección de pareja termina: pueden volver a nominarse.</p>}
          </article>
        ))}
      </div>
      {round.couples?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <strong>Parejas en la casa</strong>
          <div className="row" style={{ marginTop: 8 }}>
            {round.couples.map(pair => <span className="badge" key={pair.join("-")}>
              ♡ {pair.map(id => names.get(id)).join(" y ")}
            </span>)}
          </div>
        </div>
      )}
      {onContinue && <button className="btn btnPrimary" style={{ marginTop: 14 }} onClick={onContinue}>Continuar gala</button>}
    </section>
  );
}
