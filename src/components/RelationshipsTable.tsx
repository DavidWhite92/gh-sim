"use client";
import { useState } from "react";
import { ContestantPortrait } from "./ContestantPortrait";
import { relationshipScore } from "@/lib/relationships";
import type { GameState } from "@/lib/types";

export function RelationshipsTable({ state }: { state: GameState }) {
  const people = [...state.contestants].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const [selectedId, setSelectedId] = useState(people[0]?.id ?? "");
  const selected = people.find(c => c.id === selectedId) ?? people[0];
  if (!selected) return null;
  const entryGala = (id: string) => state.timeline[id].findIndex(status => !!status) + 1;
  return <section className="card">
    <div className="cardPad">
      <h2>Relaciones</h2>
      <p className="muted">Cada relación empieza en 50 y puede variar entre 0 y 100. La afinidad es mutua. Los eventos compartidos la modifican; los pactos solo protegen durante su gala. Mientras alguien esté fuera, la relación no cambia.</p>
      <label>Ver relaciones de <select value={selected.id} onChange={event => setSelectedId(event.target.value)}>
        {people.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select></label>
      <ContestantPortrait contestant={selected} size={31} align="left" />
    </div>
    <div className="tableWrap" tabIndex={0} role="region" aria-label="Evolución de relaciones por gala">
      <table className="table popularityTable">
        <thead><tr><th>Concursante</th><th>Inicio</th>{state.houseRounds.map(round => <th key={round.galaNumber}>Gala {round.galaNumber}</th>)}<th>Relación final</th></tr></thead>
        <tbody>{people.filter(c => c.id !== selected.id).map(c => {
          const start = Math.max(entryGala(selected.id), entryGala(c.id));
          return <tr key={c.id}>
            <td className="nameCell"><div className="row" style={{ gap: 6, flexWrap: "nowrap" }}><ContestantPortrait contestant={c} size={31} align="left" />{c.name}</div></td>
            <td>{start === 1 ? 50 : "—"}</td>
            {state.houseRounds.map((round, index) => {
              if (round.galaNumber < start) return <td key={round.galaNumber}>—</td>;
              const value = relationshipScore(round.relationships, selected.id, c.id);
              const previous = round.galaNumber === start || index === 0 ? 50 : relationshipScore(state.houseRounds[index - 1].relationships, selected.id, c.id);
              const delta = value - previous;
              const changes = round.events.filter(event => event.relationshipChanges?.some(change => [change.a, change.b].includes(selected.id) && [change.a, change.b].includes(c.id)));
              const present = round.activeIds.includes(c.id) && round.activeIds.includes(selected.id);
              return <td key={round.galaNumber} style={{ opacity: present || round.galaNumber === start ? 1 : 0.55 }} title={changes.map(event => event.title).join(" · ") || "Sin cambios"}>
                {value}{delta !== 0 && <span> ({delta > 0 ? "+" : ""}{delta})</span>}
              </td>;
            })}
            <td><b>{relationshipScore(state.relationships, selected.id, c.id)}</b> / 100</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}
