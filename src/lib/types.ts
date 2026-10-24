export type Gender = "M" | "F" | "X";

/**
 * Estados internos del simulador.
 * Nota: la UI puede "feminizar" (Salvada/Nominada/Expulsada/Ganadora/Segunda/Tercera)
 * según el género del concursante, sin cambiar el estado interno.
 */
export type Status =
  | "Entra"
  | "Exento"
  | "Nominado"
  | "Salvado"
  | "Expulsado"
  | "Finalista"
  | "Ganador"
  | "Segundo"
  | "Tercero"
  // Compatibilidad (por si hay estados antiguos en localStorage o similares)
  | "Nominada"
  | "Salvada"
  | "Expulsada"
  | "Ganadora"
  | "Segunda"
  | "Tercera";

export type ContestantSetup = {
  name: string;
  seasonId?: string;
  photoUrl?: string;
  gender?: Gender; // "M" | "F" | "X"
};

export type ContestantInput = string | ContestantSetup;

export type Contestant = {
  id: string;
  name: string;
  seasonId?: string;
  photoUrl?: string;
  gender: Gender;
};

export type Nomination = {
  fromId: string;
  points: Record<string, number>;
};

export type PublicVote = {
  galaNumber: number;
  nominees: string[];
  percents: Record<string, number>;
  expelledId: string;
  kind?: "eviction" | "final";
};

export type GalaEvents = {
  immunity?: { winnerId: string };
  leader?: { leaderId: string; savedId: string };
};

export type GalaRecord = {
  galaNumber: number;
  nominations: Nomination[];
  nominationTotals: Record<string, number>;
  provisionalNominees: string[];
  finalNominees: string[];
  events: GalaEvents;
};

export type HouseEvent = {
  title: string;
  description: string;
  participantIds: string[];
  changes: { id: string; before: number; after: number; delta: number }[];
  positive: boolean;
  conflict: boolean;
};

export type HouseRound = {
  galaNumber: number;
  events: HouseEvent[];
  popularity: Record<string, number>;
  activeIds: string[];
};

export type GameState = {
  popularity: Record<string, number>;
  houseRounds: HouseRound[];
  seed: number;
  gala: number;

  contestants: Contestant[];
  activeIds: string[];
  eliminatedIds: string[];

  timeline: Record<string, Status[]>;

  pendingNominees: string[];
  galas: GalaRecord[];
  publicVotes: PublicVote[];

  finished: boolean;
  finalRanking?: { winnerId: string; secondId: string; thirdId: string };
};

export const STATUS_COLORS: Record<Status, string> = {
  Entra: "#d66ad2",
  Exento: "#ffc6d1",
  Nominado: "#ffa800",
  Salvado: "#9ad8ea",
  Expulsado: "#ff0000",
  Finalista: "#1e88ff",
  Ganador: "#ffd400",
  Segundo: "#c9c9c9",
  Tercero: "#c7772b",

  // compat
  Nominada: "#ffa800",
  Salvada: "#9ad8ea",
  Expulsada: "#ff0000",
  Ganadora: "#ffd400",
  Segunda: "#c9c9c9",
  Tercera: "#c7772b",
};
