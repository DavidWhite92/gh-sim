import type { GameState } from "@/lib/types";

export function PopularityTable({ state }: { state: GameState }) {
  const ordered = [...state.contestants].sort((a, b) =>
    state.popularity[b.id] - state.popularity[a.id] || a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  return (
    <section className="card">
      <div className="cardPad">
        <h2 style={{ fontSize: 18, margin: 0 }}>Ranking de popularidad</h2>
        <p className="muted">Evolución tras los eventos de cada gala. Entre paréntesis, el cambio respecto a la gala anterior. Mientras estén fuera de la casa, su popularidad queda congelada; si hay repesca, vuelve a evolucionar tras su regreso. Este ranking es independiente del resultado del concurso.</p>
      </div>
      <div className="tableWrap" tabIndex={0} role="region" aria-label="Evolución de popularidad por gala">
        <table className="table popularityTable">
          <thead><tr><th>Concursante</th><th>Puesto</th><th>Inicio</th>
            {state.houseRounds.map(round => <th key={round.galaNumber}>Gala {round.galaNumber}</th>)}
            <th>Popularidad final</th>
          </tr></thead>
          <tbody>{ordered.map(c => {
            const score = state.popularity[c.id];
            const entryGala = state.timeline[c.id].findIndex(status => !!status) + 1;
            const rank = ordered.findIndex(other => state.popularity[other.id] === score) + 1;
            return <tr key={c.id}>
              <td className="nameCell">{c.name}</td><td>{rank}</td><td>{entryGala === 1 ? 50 : "—"}</td>
              {state.houseRounds.map((round, i) => {
                if (round.galaNumber < entryGala) return <td key={round.galaNumber} title="Todavía no había entrado">—</td>;
                const value = round.popularity[c.id] ?? 50;
                const previous = i === 0 ? 50 : state.houseRounds[i - 1].popularity[c.id] ?? 50;
                const delta = round.galaNumber === entryGala ? 0 : value - previous;
                const present = round.activeIds.includes(c.id) || round.galaNumber === entryGala;
                const details = round.events.filter(event => event.participantIds.includes(c.id)).map(event => event.title).join(" · ");
                return <td key={round.galaNumber} style={{ opacity: present ? 1 : 0.55 }} title={present ? details || "Sin cambios" : "Fuera de la casa: popularidad congelada"}>
                  {value}{delta !== 0 && <span> ({delta > 0 ? "+" : ""}{delta})</span>}
                </td>;
              })}
              <td><b>{score}</b> / 100</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <div className="cardPad">
        <details><summary style={{ cursor: "pointer" }}>Consultar los eventos de la temporada</summary>
          {state.houseRounds.map(round => <div key={round.galaNumber} style={{ marginTop: 12 }}>
            <b>Gala {round.galaNumber}</b>
            <ul>{round.events.map((event, i) => <li key={i}>{event.title}: {event.changes.map(change => {
              const name = state.contestants.find(c => c.id === change.id)?.name;
              return `${name} (${change.delta > 0 ? "+" : ""}${change.delta})`;
            }).join(", ")}</li>)}</ul>
          </div>)}
        </details>
      </div>
    </section>
  );
}
