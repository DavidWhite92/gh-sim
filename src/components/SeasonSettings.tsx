"use client";

import { useRef, useState } from "react";
import type { GameOptions, PrivilegePolicy } from "@/lib/types";

function Choices<T extends string>({ name, value, options, onChange }: {
  name: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void;
}) {
  return <div className="seasonChoices">{options.map(option => <label key={option.value}>
    <input type="radio" name={name} value={option.value} checked={value === option.value}
      onChange={() => onChange(option.value)} /> {option.label}
  </label>)}</div>;
}

export function SeasonSettings({ options, onChange, reserveCount, participantCount, onChooseReserves }: {
  options: GameOptions; onChange: (options: GameOptions) => void; reserveCount: number; participantCount: number; onChooseReserves: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const update = (patch: Partial<GameOptions>) => onChange({ ...options, ...patch });
  const policies: { value: PrivilegePolicy; label: string }[] = [
    { value: "random", label: "Aleatorio" }, { value: "always", label: "Siempre" }, { value: "never", label: "Deshabilitar" },
  ];
  return <>
    <button type="button" className="seasonSettingsToggle" aria-label="Personalizar temporada"
      title="Personalizar temporada" aria-haspopup="dialog" aria-expanded={open}
      onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="m9 3 1-2h4l1 2 2 1 2-1 2 3-1 2v3l2 2-2 3-2-1-3 2-1 3h-4l-1-3-3-2-2 1-2-3 2-2V8L3 6l2-3 2 1Z" transform="translate(0 1) scale(.92)" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
    <dialog ref={dialog} className="seasonSettings" aria-labelledby="season-settings-title" onClose={() => setOpen(false)}>
      <div className="row">
        <h2 id="season-settings-title">Personaliza tu temporada</h2>
        <button type="button" className="btn" aria-label="Cerrar configuración" onClick={() => dialog.current?.close()}>✕</button>
      </div>
      <p className="muted">Puedes cambiar estas opciones hasta pulsar Empezar. Durante la temporada quedan fijadas.</p>
      <fieldset><legend>Abandonos</legend>
        <label><input type="checkbox" checked={!!options.withdrawals} onChange={e => update({ withdrawals: e.target.checked })} /> Activar abandonos</label>
        <p>Muy poco frecuentes: hasta 3, con menos probabilidad tras cada abandono. No ocurren con 5 participantes o menos.</p>
        <p>Necesitas al menos 1 reserva; para poder llegar a 3 abandonos, necesitas al menos 3 reservas.</p>
        <p role="status">Reservas elegidos: <b>{reserveCount}</b>. {options.withdrawals && reserveCount === 0 && "Añade un reserva antes de empezar."}</p>
        <button type="button" className="btn" onClick={() => { dialog.current?.close(); onChooseReserves(); }}>Elegir reservas</button>
      </fieldset>
      <fieldset><legend>Repesca</legend>
        <Choices name="repechage" value={options.repechage === "random" ? "random" : options.repechage ? "yes" : "no"}
          options={[{ value: "no", label: "Desactivada" }, { value: "yes", label: "Activada: habrá una repesca" }, { value: "random", label: "Aleatoria: puede haber o no" }]}
          onChange={value => update({ repechage: value === "random" ? "random" : value === "yes" })} />
        <p>Desde la cuarta expulsión, con al menos 3 expulsados anteriores. El recién expulsado queda fuera. Se mantiene el límite según el reparto y debe haber al menos 6 en casa antes del regreso.</p>
      </fieldset>
      <fieldset><legend>Final</legend>
        <Choices name="finalSize" value={String(options.finalSize ?? 3)}
          options={[{ value: "3", label: "3 finalistas" }, { value: "4", label: "4 finalistas" }, { value: "random", label: "Aleatoria: sorpresa hasta la final" }]}
          onChange={value => update({ finalSize: value === "random" ? "random" : value === "4" ? 4 : 3 })} />
      </fieldset>
      <fieldset><legend>Nominaciones</legend>
        <Choices name="nominationMode" value={options.nominationMode ?? "traditional"}
          options={[{ value: "traditional", label: "Tradicional · 3, 2 y 1" }, { value: "gh24", label: "GH2–GH4 · 1 punto a 3 personas" },
            { value: "gh1", label: "GH1 · 1 punto a 2 personas" }, { value: "positive", label: "Positivo · 3, 2 y 1 para quedarse" },
            { value: "randomPositive", label: "Positivo Aleatorio · tradicional con galas positivas ocasionales" }, { value: "random", label: "Aleatorio · un modo para toda la temporada" }]}
          onChange={value => update({ nominationMode: value })} />
        <p>Tradicional: con 4 concursantes, 2 y 1. GH1: mínimo 2 nominados; el resto de modos, mínimo 3 (2 en la última nominación tradicional), más los empates.</p>
        <p>Positivo Aleatorio: cada gala tiene un 15 % de probabilidad de votar con +3, +2 y +1; el resto se nomina en negativo con las reglas tradicionales.</p>
        <p>En positivo quedan nominados quienes reciben menos puntos; se prioriza apoyar a las personas más afines.</p>
      </fieldset>
      <fieldset><legend>Recta Final</legend>
        <label><input type="checkbox" checked={!!options.finalStretch} onChange={event => {
          update({ finalStretch: event.target.checked });
          if (event.target.checked && participantCount < 14) window.alert("Recta Final requiere al menos 14 concursantes. Añade participantes antes de empezar.");
        }} /> Activar Recta Final</label>
        <p>Compatible con cualquier modo. Requiere al menos 14 concursantes al inicio.</p>
        <p>Comenzará al azar cuando queden entre 8 y 4 participantes (final de 3), o entre 8 y 5 (final de 4). Desde entonces no hay nominaciones entre compañeros ni privilegios: el público vota para salvar y sale quien recibe menos porcentaje.</p>
        <p>Se mantiene la exención de los reservas y repescados durante su gala de entrada.</p>
        {options.finalStretch && participantCount < 14 && <p role="alert">Faltan {14 - participantCount} concursantes para poder empezar con Recta Final.</p>}
      </fieldset>
      <fieldset><legend>Privilegios</legend>
        <h3>Líder</h3><Choices name="leaderPolicy" value={options.leaderPolicy ?? "random"} options={policies} onChange={value => update({ leaderPolicy: value })} />
        <h3>Inmune</h3><Choices name="immunityPolicy" value={options.immunityPolicy ?? "random"} options={policies} onChange={value => update({ immunityPolicy: value })} />
        <p>Nunca hay inmunidad con 5 participantes o menos. Puedes combinar los dos privilegios de forma independiente.</p>
        <button type="button" className="btn" onClick={() => update({ leaderPolicy: "random", immunityPolicy: "random" })}>Ambos aleatorios</button>
      </fieldset>
      <button type="button" className="btn btnPrimary" onClick={() => dialog.current?.close()}>Listo</button>
    </dialog>
  </>;
}
