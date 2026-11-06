import { isSavedGame } from "@/lib/savedGame";
import { storeGame } from "@/lib/saveRepository";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "Partida vacía." }, { status: 400 });
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 8 * 1024 * 1024) { await reader.cancel(); return Response.json({ error: "La partida supera el tamaño permitido." }, { status: 413 }); }
      chunks.push(value);
    }
    let game: unknown;
    try { game = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return Response.json({ error: "Partida no válida." }, { status: 400 }); }
    if (!isSavedGame(game)) return Response.json({ error: "Partida no válida." }, { status: 400 });
    const code = await storeGame(game);
    return Response.json({ code }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "No se pudo guardar en el servidor. Tu partida sigue abierta; inténtalo de nuevo." }, { status: 503 });
  }
}
