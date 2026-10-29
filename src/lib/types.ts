export type Gender = "M" | "F" | "X";

/**
 * Estados internos del simulador.
 * Nota: la UI puede "feminizar" (Salvada/Nominada/Expulsada/Ganadora/Segunda/Tercera)
 * según el género del concursante, sin cambiar el estado interno.
 */
export type Status =
  | "Entra"
  | "Repesca"
  | "Abandono"
  | "Exento"
  | "NominadoPublico"
  | "Nominado"
  | "Salvado"
  | "Expulsado"
  | "Finalista"
  | "Ganador"
  | "Segundo"
  | "Tercero"
  | "Cuarto"
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
  voteToSave?: boolean;
  galaNumber: number;
  nominees: string[];
  percents: Record<string, number>;
  expelledId: string;
  kind?: "eviction" | "final";
};

export type RepechageRecord = {
  galaNumber: number;
  evictionNumber: number;
  candidateIds: string[];
  percents: Record<string, number>;
  returnedId: string;
};

export type NominationMode = "traditional" | "gh24" | "gh1" | "positive" | "randomPositive";
export type PrivilegePolicy = "random" | "always" | "never";

export type GameOptions = {
  finalStretch?: boolean;
  finalSize?: 3 | 4 | "random";
  nominationMode?: NominationMode | "random";
  leaderPolicy?: PrivilegePolicy;
  leaderMode?: "save" | "subtract3" | "subtract1" | "random";
  immunityPolicy?: PrivilegePolicy;
  repechage?: boolean | "random";
  withdrawals?: boolean;
  reserves?: ContestantSetup[];
};

export type WithdrawalRecord = {
  galaNumber: number;
  phase: "before" | "after";
  departedId: string;
  replacementId: string;
  followedId?: string;
};

export type GalaEvents = {
  withdrawal?: WithdrawalRecord;
  repechage?: RepechageRecord;
  immunity?: { winnerId: string };
  leader?: { leaderId: string; savedId: string };
  leaderSubtract?: { leaderId: string; targetId: string; before: number; after: number };
};

export type GalaRecord = {
  finalStretch?: boolean;
  nominationMode?: NominationMode;
  galaNumber: number;
  nominations: Nomination[];
  nominationTotals: Record<string, number>;
  provisionalNominees: string[];
  finalNominees: string[];
  events: GalaEvents;
};

export type HouseEventEffect = "pact" | "connection" | "romance" | "couple" | "breakup";

export type Relationships = Record<string, Record<string, number>>;

export type HouseEvent = {
  relationshipChanges?: { a: string; b: string; before: number; after: number; delta: number }[];
  effect?: HouseEventEffect;
  title: string;
  description: string;
  participantIds: string[];
  changes: { id: string; before: number; after: number; delta: number }[];
  positive: boolean;
  conflict: boolean;
};

export type HouseRound = {
  finalStretch?: boolean;
  nominationMode?: NominationMode;
  couples: [string, string][];
  galaNumber: number;
  events: HouseEvent[];
  popularity: Record<string, number>;
  relationships: Relationships;
  activeIds: string[];
};

export type GameState = {
  finalStretchAt?: number;
  finalStretchActive: boolean;
  pendingVoteToSave: boolean;
  finalSize: 3 | 4;
  nominationMode: NominationMode;
  leaderPolicy: PrivilegePolicy;
  leaderMode: "save" | "subtract3" | "subtract1";
  immunityPolicy: PrivilegePolicy;
  withdrawalsEnabled: boolean;
  reserves: Contestant[];
  withdrawals: WithdrawalRecord[];
  repechageAfterEvictions?: number;
  repechage?: RepechageRecord;
  popularity: Record<string, number>;
  relationships: Relationships;
  houseRounds: HouseRound[];
  couples: [string, string][];
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
  finalRanking?: { winnerId: string; secondId: string; thirdId: string; fourthId?: string };
};

export const STATUS_COLORS: Record<Status, string> = {
  Entra: "#d66ad2",
  Repesca: "#d66ad2",
  Abandono: "#ffa07a",
  Exento: "#ffc6d1",
  Nominado: "#ffa800",
  NominadoPublico: "#f3f781",
  Salvado: "#9ad8ea",
  Expulsado: "#ff0000",
  Finalista: "#1e88ff",
  Ganador: "#ffd400",
  Segundo: "#c9c9c9",
  Tercero: "#c7772b",
  Cuarto: "#b6a28a",

  // compat
  Nominada: "#ffa800",
  Salvada: "#9ad8ea",
  Expulsada: "#ff0000",
  Ganadora: "#ffd400",
  Segunda: "#c9c9c9",
  Tercera: "#c7772b",
};
