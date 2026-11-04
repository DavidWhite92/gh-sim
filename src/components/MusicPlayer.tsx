"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Scene } from "./SceneBackground";

const tracks: Record<Scene, string | null> = {
  plato: "/music/plato.mp3", nominacion: "/music/nominaciones.mp3",
  expulsion: "/music/expulsion.mp3", final: "/music/tension.mp3", entrada: null, salon: null,
};
const MusicCue = createContext<(track: string | null) => void>(() => {});
export function useSceneMusic(scene: Scene) {
  const cue = useContext(MusicCue);
  useEffect(() => { cue(tracks[scene]); return () => cue(null); }, [cue, scene]);
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [track, cue] = useState<string | null>(null);
  const [volume, setVolume] = useState(30);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem("gh_music") || "{}");
      if (Number.isFinite(prefs.volume)) setVolume(Math.max(0, Math.min(100, prefs.volume)));
      setMuted(prefs.muted === true);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !audio.current) return;
    audio.current.volume = volume / 100;
    audio.current.muted = muted;
    try { localStorage.setItem("gh_music", JSON.stringify({ volume, muted })); } catch {}
  }, [volume, muted, ready]);
  useEffect(() => {
    const player = audio.current;
    if (!player || !ready) return;
    if (!track) { player.pause(); player.removeAttribute("src"); player.load(); return; }
    player.src = track;
    const play = () => { if (player.paused) void player.play().catch(() => {}); };
    // Algunos navegadores esperan el primer gesto antes de permitir sonido.
    play();
    document.addEventListener("click", play);
    document.addEventListener("keydown", play);
    return () => { player.pause(); document.removeEventListener("click", play); document.removeEventListener("keydown", play); };
  }, [track, ready]);
  return <MusicCue.Provider value={cue}>
    {children}
    <audio ref={audio} loop preload="none" />
    <div className="musicControls" role="group" aria-label="Música">
      <button type="button" aria-label={muted ? "Activar música" : "Silenciar música"} title={muted ? "Activar música" : "Silenciar música"} aria-pressed={muted} onClick={() => setMuted(!muted)}>{muted ? "🔇" : "♫"}</button>
      <input type="range" min="0" max="100" aria-label="Volumen de la música" value={volume} onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }} />
    </div>
  </MusicCue.Provider>;
}
