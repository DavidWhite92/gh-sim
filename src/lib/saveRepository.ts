import { randomInt } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { isSavedGame, SAVE_CODE, type SavedGame } from "./savedGame";

function directory() {
  if (process.env.VERCEL && !process.env.GH_SAVE_DIR) throw new Error("Persistent storage required");
  return process.env.GH_SAVE_DIR || path.join(process.cwd(), ".data", "saves");
}
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export async function storeGame(game: SavedGame): Promise<string> {
  if (!isSavedGame(game)) throw new Error("Invalid save");
  const dir = directory();
  await mkdir(dir, { recursive: true });
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join("");
    try {
      // Exclusive creation prevents collisions from overwriting another season.
      await writeFile(path.join(dir, `${code}.json`), JSON.stringify(game), { flag: "wx", mode: 0o600 });
      return code;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  }
  throw new Error("Cannot allocate code");
}
export async function restoreGame(code: string): Promise<SavedGame | null> {
  if (!SAVE_CODE.test(code)) return null;
  try {
    const saved: unknown = JSON.parse(await readFile(path.join(directory(), `${code}.json`), "utf8"));
    if (!isSavedGame(saved)) throw new Error("Invalid saved data");
    return saved;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
