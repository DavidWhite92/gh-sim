import { restoreGame, SaveStorageUnavailable } from "@/lib/saveRepository";
import { SAVE_CODE } from "@/lib/savedGame";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const code = (await context.params).code.toUpperCase();
  if (!SAVE_CODE.test(code)) return Response.json({ error: "El código debe tener 8 letras y números." }, { status: 400 });
  try {
    const game = await restoreGame(code);
    if (!game) return Response.json({ error: "No hay ninguna partida con ese código. Compruébalo e inténtalo de nuevo." }, { status: 404 });
    return Response.json(game, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ error: error instanceof SaveStorageUnavailable ? error.message : "No se pudo acceder a las partidas guardadas. Inténtalo más tarde." }, { status: 503 }); }
}
