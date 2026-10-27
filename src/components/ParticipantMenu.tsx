"use client";

import { useEffect, useState } from "react";
import type { Gender } from "@/lib/types";

type Participant = { id: string; name: string; gender: Gender; status?: string };

export function ParticipantMenu({ participants }: { participants: Participant[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const screen = window.matchMedia("(min-width: 901px)");
    const update = () => setOpen(screen.matches);
    update();
    screen.addEventListener("change", update);
    return () => screen.removeEventListener("change", update);
  }, []);

  const labels: Record<string, { file: string; text: string }> = {
    Nominado: { file: "nominado", text: "Nominado" },
    Nominada: { file: "nominado", text: "Nominada" },
    Expulsado: { file: "expulsado", text: "Expulsado" },
    Abandono: { file: "abandono", text: "Abandono" },
    Finalista: { file: "finalista", text: "Finalista" },
    Segundo: { file: "2puesto", text: "Segundo puesto" },
    Tercero: { file: "3puesto", text: "Tercer puesto" },
    Ganador: { file: "ganador", text: "Ganador" },
  };

  return <aside className="participantMenu" data-open={open} aria-label="Participantes"
    onKeyDown={event => {
      if (event.key === "Escape") {
        setOpen(false);
        event.currentTarget.querySelector<HTMLButtonElement>("button")?.focus();
      }
    }}>
    <button type="button" className="participantMenuToggle" aria-expanded={open}
      aria-controls="participant-menu-list" aria-label={open ? "Cerrar participantes" : "Abrir participantes"}
      onClick={() => setOpen(value => !value)}>
      <span aria-hidden="true">{open ? "‹" : "›"}</span>
    </button>
    <div id="participant-menu-list" className="participantMenuPanel" hidden={!open}>
      <h2>Participantes</h2>
      <ul>{participants.map(person => {
        const label = person.status === "Ganador" && person.gender === "F"
          ? { file: "ganadora", text: "Ganadora" } : labels[person.status ?? ""];
        return <li key={person.id}>
          <span className="participantMenuName">{person.name}</span>
          {label && <img className="participantMenuLabel" src={`/status-labels/${label.file}_gh.gif`}
            alt={label.text} width={90} height={15} />}
        </li>;
      })}</ul>
    </div>
  </aside>;
}
