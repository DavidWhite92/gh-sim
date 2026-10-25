"use client";

import { useRef, useState } from "react";
import { downloadTableJpg } from "@/lib/downloadTableJpg";
import { GameState, STATUS_COLORS, Status, Gender } from "@/lib/types";

function cellBg(status?: Status) {
  if (!status) return "transparent";
  // Color especial para Inmune (internamente puede seguir siendo "Exento")
  if (status === ("Exento" as Status)) return "#9df09d";
  return STATUS_COLORS[status] ?? "transparent";
}

function isFinalBold(status?: Status) {
  return status === "Ganador" || status === "Segundo" || status === "Tercero" || status === "Ganadora" || status === "Segunda" || status === "Tercera";
}

function displayStatus(status: Status, gender: Gender): string {
  // En la tabla mostramos "Inmune" en vez de "Exento"
  if (status === ("Exento" as Status)) return "Inmune";

  const isF = gender === "F";

  // Normalizamos posibles estados antiguos
  const s = status as string;

  const mapF: Record<string, string> = {
    Salvado: "Salvada",
    Nominado: "Nominada",
    Expulsado: "Expulsada",
    Ganador: "Ganadora",
    Segundo: "Segunda",
    Tercero: "Tercera",
  };

  const mapM: Record<string, string> = {
    Salvada: "Salvado",
    Nominada: "Nominado",
    Expulsada: "Expulsado",
    Ganadora: "Ganador",
    Segunda: "Segundo",
    Tercera: "Tercero",
  };

  if (isF) return mapF[s] ?? s;
  return mapM[s] ?? s;
}

function cellLabel(status: Status | undefined, gender: Gender) {
  if (!status) return "";
  return displayStatus(status, gender);
}

export function ResultsTable({ state }: { state: GameState }) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const onDownload = async () => {
    if (!tableRef.current || downloading) return;
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadTableJpg(tableRef.current, `resultado-galas-${state.seed}.jpg`);
    } catch {
      setDownloadError("No se pudo descargar la tabla. Inténtalo de nuevo.");
    } finally {
      setDownloading(false);
    }
  };
  const maxCols = Math.max(...Object.values(state.timeline).map(a => a.length), 1);

  const cellBorder = (typeof document !== "undefined" && document.documentElement.dataset.theme === "light")
    ? "1px solid rgba(0,0,0,0.18)"
    : "1px solid rgba(255,255,255,0.12)";

  // Selección de columnas: quitamos huecos "al final" antes de la columna Final (p. ej. una Gala vacía extra)
  const finished = !!(state as any).finished;
  const allIds = Object.keys(state.timeline);

  let colIndices = Array.from({ length: maxCols }, (_, i) => i);
  if (finished && colIndices.length >= 2) {
    const finalIdx = colIndices[colIndices.length - 1];

    const hasAnyCell = (col: number) =>
      allIds.some(id => {
        const v = (state.timeline as any)[id]?.[col];
        return typeof v === "string" && v.length > 0;
      });

    const hasAnyVote = (galaNumber: number) =>
      (state.publicVotes ?? []).some((v: any) => v.galaNumber === galaNumber && (v.kind ?? "eviction") === "eviction");

    // elimina columnas vacías justo antes de Final (pero nunca elimina Final)
    while (colIndices.length >= 2) {
      const prev = colIndices[colIndices.length - 2];
      if (prev === finalIdx) break;
      // Si la columna previa no tiene celdas y tampoco tiene voto asociado, es un hueco.
      if (!hasAnyCell(prev) && !hasAnyVote(prev + 1)) {
        colIndices.splice(colIndices.length - 2, 1);
        continue;
      }
      break;
    }
  }

  const headers = colIndices.map((col) =>
    finished && col === colIndices[colIndices.length - 1] ? "Final" : `Gala ${col + 1}`
  );

  const idToName = new Map(state.contestants.map(c => [c.id, c.name]));
  const idToGender = new Map(state.contestants.map(c => [c.id, (c as any).gender as Gender]));

  // Mapa galaNumber -> savedId cuando el líder salva a alguien
  const leaderSavedByGala = new Map<number, string>();
  for (const gr of (state.galas ?? [])) {
    const savedId = (gr as any)?.events?.leader?.savedId as string | undefined;
    if (savedId) leaderSavedByGala.set(gr.galaNumber, savedId);
  }


  // Orden de filas:
  // activos arriba; expulsados abajo (primer eliminado, el último)
  const eliminatedRev = [...state.eliminatedIds].reverse();
  const alphabeticalActiveIds = [...state.activeIds].sort((a, b) =>
    (idToName.get(a) ?? a).localeCompare(idToName.get(b) ?? b, "es", { sensitivity: "base" })
  );

  let orderedIds: string[] = [];
  if ((state as any).finished && (state as any).finalRanking) {
    const fr = (state as any).finalRanking;
    orderedIds = [fr.winnerId, fr.secondId, fr.thirdId];
    const rest = state.contestants.map(c => c.id).filter(id => !orderedIds.includes(id));
    const restActive = alphabeticalActiveIds.filter(id => rest.includes(id));
    const restElim = eliminatedRev.filter(id => rest.includes(id));
    orderedIds = [...orderedIds, ...restActive, ...restElim];
  } else {
    orderedIds = [...alphabeticalActiveIds, ...eliminatedRev];
  }

  // votos de expulsión (no final)
  const evictionVotes = (state.publicVotes ?? []).filter((v: any) => (v.kind ?? "eviction") === "eviction");
  const voteByGala = new Map(evictionVotes.map((v: any) => [v.galaNumber, v]));

  // voto final
  const finalVote = (state.publicVotes ?? []).find((v: any) => (v.kind ?? "") === "final");

  return (
    <section className="card">
      <div className="cardPad">
        <div className="row">
          <div style={{ fontWeight: 900 }}>Recorrido por galas</div>
          <button className="btn" onClick={onDownload} disabled={downloading}>
            {downloading ? "Generando JPG…" : "Descargar Tabla"}
          </button>
          {downloadError && <span role="alert">{downloadError}</span>}
          <span className="badge muted">Tabla compacta · estados sin negrita</span>
        </div>
      </div>

      <div className="tableWrap">
        <table ref={tableRef} className="table">
          <thead>
            <tr>
              <th style={{ textAlign: "center", border: cellBorder }}>Concursante</th>
              {headers.map(h => (
                <th key={h} style={{ border: cellBorder }}>{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {orderedIds.map(id => {
              const name = idToName.get(id) ?? id;
              const row = state.timeline[id] ?? [];
              return (
                <tr key={id}>
                  <td className="nameCell" style={{ textAlign: "center", border: cellBorder }}>{name}</td>
                  {(() => {
  // Si alguien fue expulsado, pintamos en gris claro las celdas vacías posteriores
  let outside = true;
  const absentColumns = row.map(status => {
    if (status && status !== "Expulsado" && status !== "Expulsada" && status !== "Abandono") outside = false;
    const absent = outside && !status;
    if (status === "Expulsado" || status === "Expulsada" || status === "Abandono") outside = true;
    return absent;
  });
  return colIndices.map((i) => {
    const st = row[i] as Status | undefined;
    const afterExpelledEmpty = absentColumns[i];

    // Color especial: "Salvado/a" por el líder (no simplemente salvado por no estar nominado)
    const galaNumber = (finished && i === colIndices[colIndices.length - 1]) ? null : (i + 1);
    const isLeaderSavedCell = !!(galaNumber && st === "Salvado" && leaderSavedByGala.get(galaNumber) === id);

    return (
      <td
        key={i}
        style={{
          background: afterExpelledEmpty ? "#d1d5db" : (isLeaderSavedCell ? "#ccff66" : cellBg(st)),
          border: cellBorder,
        }}
      >
        <span className={isFinalBold(st) ? "cellFinal" : "cellText"}>
          {afterExpelledEmpty ? "" : cellLabel(st, idToGender.get(id) ?? "X")}
        </span>
      </td>
    );
  });
})()}
                </tr>
              );
            })}

            <tr>
              <td colSpan={colIndices.length + 1} style={{ padding: 0 }}>
                <div style={{ height: 10 }} />
              </td>
            </tr>

            {/* Eliminados */}
            <tr className="summaryRow">
              <td className="nameCell" style={{ textAlign: "center", border: cellBorder }}>Eliminados</td>
              {colIndices.map((i) => {
                const galaNumber = i + 1;

                // Final column
                if ((state as any).finished && i === maxCols - 1 && finalVote && (state as any).finalRanking) {
                  const fr = (state as any).finalRanking;
                  const third = fr.thirdId;
                  const second = fr.secondId;
                  return (
                    <td key={i} style={{ textAlign: "center", border: cellBorder }}>
                      <div className="smallList smallListCenter">
                        <span><b>{idToName.get(third)}</b></span>
                        <span>{(finalVote.percents?.[third] ?? 0).toFixed(1)}%</span>
                        <div style={{ height: 6 }} />
                        <span><b>{idToName.get(second)}</b></span>
                        <span>{(finalVote.percents?.[second] ?? 0).toFixed(1)}%</span>
                      </div>
                    </td>
                  );
                }

                const vote = voteByGala.get(galaNumber);
                if (!vote) return <td key={i} style={{ border: cellBorder }} />;

                const expelledName = idToName.get(vote.expelledId) ?? vote.expelledId;
                const expelledPct = vote.percents[vote.expelledId];

                return (
                  <td key={i} style={{ textAlign: "center", border: cellBorder }}>
                    <div className="smallList smallListCenter">
                      <span><b>{expelledName}</b></span>
                      <span>{(expelledPct ?? 0).toFixed(1)}%</span>
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* No eliminados */}
            <tr className="summaryRow">
              <td className="nameCell" style={{ textAlign: "center", border: cellBorder }}>No eliminados</td>
              {colIndices.map((i) => {
                const galaNumber = i + 1;

                // Final column
                if ((state as any).finished && i === maxCols - 1 && finalVote && (state as any).finalRanking) {
                  const fr = (state as any).finalRanking;
                  const winner = fr.winnerId;
                  return (
                    <td key={i} style={{ textAlign: "center", border: cellBorder }}>
                      <div className="smallListCenter" style={{ display: "grid", gap: 6 }}>
                        <span><b>{idToName.get(winner)}</b></span>
                        <span>{(finalVote.percents?.[winner] ?? 0).toFixed(1)}%</span>
                      </div>
                    </td>
                  );
                }

                const vote = voteByGala.get(galaNumber);
                if (!vote) return <td key={i} style={{ border: cellBorder }} />;

                const others = vote.nominees
                  .filter((id: string) => id !== vote.expelledId)
                  .map((id: string) => ({
                    id,
                    name: idToName.get(id) ?? id,
                    pct: vote.percents[id] ?? 0,
                  }))
                  .sort((a: any, b: any) => b.pct - a.pct);

                return (
                  <td key={i} style={{ textAlign: "center", border: cellBorder }}>
                    <div className="smallListCenter" style={{ display: "grid", gap: 6 }}>
                      {others.map((o: any, idx: number) => (
                        <div key={o.id} style={{ marginBottom: idx === others.length - 1 ? 0 : 6 }}>
                          <span><b>{o.name}</b></span>
                          <div><span>{o.pct.toFixed(1)}%</span></div>
                        </div>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="cardPad muted" style={{ fontSize: 12 }}>
        Tip: los porcentajes aparecen en la columna de la gala en la que se revela la expulsión.
      </div>
    </section>
  );
}
