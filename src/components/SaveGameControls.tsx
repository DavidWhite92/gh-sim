"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SAVE_CODE, type SavedGame } from "@/lib/savedGame";

export function LoadGameButton() {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  return <>
    <button type="button" className="btn" onClick={() => { setError(""); dialog.current?.showModal(); }}>Cargar</button>
    <dialog ref={dialog} className="saveGameDialog" aria-labelledby="load-game-title">
      <form onSubmit={event => {
        event.preventDefault(); const normalized = code.trim().toUpperCase();
        if (!SAVE_CODE.test(normalized)) { setError("Introduce un código de 8 letras y números."); return; }
        dialog.current?.close(); router.push(`/simulator?load=${normalized}`);
      }}>
        <h2 id="load-game-title">Cargar temporada</h2>
        <label htmlFor="save-code">Código de la partida</label>
        <input id="save-code" autoFocus autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={8} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="AB12CD34" />
        {error && <p role="alert">{error}</p>}
        <div className="row"><button className="btn btnPrimary" type="submit">Cargar</button><button className="btn" type="button" onClick={() => dialog.current?.close()}>Cancelar</button></div>
      </form>
    </dialog>
  </>;
}

export function SaveGameButton({ snapshot }: { snapshot: SavedGame }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  async function save() {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError(""); setCode(""); setCopied(false); dialog.current?.showModal();
    try {
      const response = await fetch("/api/saves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshot) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      if (!SAVE_CODE.test(result.code)) throw new Error("El servidor no devolvió un código válido.");
      setCode(result.code);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar. Inténtalo de nuevo."); }
    finally { busy.current = false; setSaving(false); }
  }
  return <>
    <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? "Guardando…" : "Guardar"}</button>
    <dialog ref={dialog} className="saveGameDialog" aria-labelledby="save-game-title" onCancel={event => { if (saving) event.preventDefault(); }}>
      <h2 id="save-game-title">Guardar temporada</h2>
      {saving && <p role="status">Guardando el progreso…</p>}
      {error && <p role="alert">{error}</p>}
      {code && <>
        <p>Partida guardada. Introduce este código en «Cargar» para continuar desde este momento:</p>
        <output className="saveCode">{code}</output>
        <p>Cada guardado crea un código nuevo; los anteriores conservan su progreso. Puedes usarlo desde otro dispositivo en esta misma web.</p>
        <button className="btn" type="button" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); } catch { setError("Selecciona el código para copiarlo manualmente."); } }}>{copied ? "Copiado" : "Copiar código"}</button>
      </>}
      <button className="btn" type="button" disabled={saving} onClick={() => dialog.current?.close()}>Cerrar</button>
    </dialog>
  </>;
}
