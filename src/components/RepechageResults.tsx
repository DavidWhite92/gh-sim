import type { GameState, RepechageRecord } from "@/lib/types";

export function RepechageResults({ state, record }: { state: GameState; record: RepechageRecord }) {
  const names = new Map(state.contestants.map(c => [c.id, c.name]));
  const ranked = [...record.candidateIds].sort((a, b) => record.percents[b] - record.percents[a]);
  return (
    <div>
      <h3 style={{ margin: "0 0 10px" }}>Repesca: vuelve {names.get(record.returnedId)}</h3>
      <p className="muted">Porcentajes para volver a la casa. En esta gala no nomina ni puede recibir nominaciones.</p>
      <div className="tableWrap">
        <table className="table" aria-label="Porcentajes de la repesca">
          <thead><tr><th>Concursante</th><th>Apoyo del público</th></tr></thead>
          <tbody>{ranked.map(id => <tr key={id}>
            <td>{id === record.returnedId ? <b>{names.get(id)} · Repesca</b> : names.get(id)}</td>
            <td>{record.percents[id].toFixed(1)}%</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
