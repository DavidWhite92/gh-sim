import { randomInt } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { isSavedGame, SAVE_CODE, type SavedGame } from "./savedGame";

export class SaveStorageUnavailable extends Error {
  constructor() { super("El guardado online aún no está configurado. Tu temporada sigue abierta; no la reinicies."); }
}
function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url && !token) return null;
  if (!url || !token || !url.startsWith("https://")) throw new SaveStorageUnavailable();
  return { url, token };
}
async function redisCommand(config: { url: string; token: string }, command: string[]) {
  const response = await fetch(config.url, {
    method: "POST", headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command), cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Save storage request failed");
  const data = await response.json();
  if (data.error) throw new Error("Save storage command failed");
  return data.result as string | null;
}
function directory() {
  // Vercel functions cannot use the deployment filesystem for durable saves.
  if (process.env.VERCEL) throw new SaveStorageUnavailable();
  return process.env.GH_SAVE_DIR || path.join(process.cwd(), ".data", "saves");
}
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export async function storeGame(game: SavedGame): Promise<string> {
  if (!isSavedGame(game)) throw new Error("Invalid save");
  const redis = redisConfig();
  const dir = redis ? null : directory();
  if (dir) await mkdir(dir, { recursive: true });
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join("");
    if (redis) {
      // NX reserves the code atomically. No expiry: old codes retain their saves.
      const result = await redisCommand(redis, ["SET", `gh-sim:save:v1:${code}`, JSON.stringify(game), "NX"]);
      if (result === "OK") return code;
      if (result === null) continue;
      throw new Error("Unexpected save storage response");
    }
    try {
      // Exclusive creation prevents collisions from overwriting another season.
      await writeFile(path.join(dir!, `${code}.json`), JSON.stringify(game), { flag: "wx", mode: 0o600 });
      return code;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  }
  throw new Error("Cannot allocate code");
}
export async function restoreGame(code: string): Promise<SavedGame | null> {
  if (!SAVE_CODE.test(code)) return null;
  const redis = redisConfig();
  try {
    const raw = redis ? await redisCommand(redis, ["GET", `gh-sim:save:v1:${code}`])
      : await readFile(path.join(directory(), `${code}.json`), "utf8");
    if (raw === null) return null;
    const saved: unknown = JSON.parse(raw);
    if (!isSavedGame(saved)) throw new Error("Invalid saved data");
    return saved;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
