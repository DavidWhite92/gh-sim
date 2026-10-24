import type { GameState, HouseEvent, HouseRound } from "./types";
import { shuffle } from "./rng";

type EventTemplate = {
  title: string;
  description: string;
  min: number;
  max: number;
  impact: [number, number];
  conflict?: boolean;
};

const templates: EventTemplate[] = [
  { title: "Un gesto de cariño", description: "Prepara una sorpresa para animar a la casa. El público valora el detalle.", min: 1, max: 1, impact: [3, 6] },
  { title: "Una historia que emociona", description: "Comparte una vivencia personal y conecta con la audiencia.", min: 1, max: 1, impact: [7, 12] },
  { title: "Talento inesperado", description: "Sorprende con una actuación improvisada que se convierte en el momento de la noche.", min: 1, max: 1, impact: [5, 9] },
  { title: "Trabajo silencioso", description: "Se encarga de las tareas que nadie quería hacer. Fuera de la casa, el gesto no pasa desapercibido.", min: 1, max: 1, impact: [2, 5] },
  { title: "Una amistad que conquista", description: "Comparten una conversación sincera y se apoyan en un momento difícil.", min: 2, max: 2, impact: [4, 8] },
  { title: "Reconciliación", description: "Aparcan sus diferencias y se piden disculpas. La audiencia aprecia su actitud.", min: 2, max: 2, impact: [5, 10] },
  { title: "Noche de risas", description: "Improvisan un pequeño espectáculo y contagian su buen humor al público.", min: 2, max: 3, impact: [3, 7] },
  { title: "Un equipo solidario", description: "Se organizan para ayudar en las tareas y consiguen mejorar la convivencia.", min: 3, max: 3, impact: [4, 8] },
  { title: "Una prueba memorable", description: "Remontan una prueba que parecía perdida. Su esfuerzo en equipo entusiasma a la audiencia.", min: 4, max: 6, impact: [8, 14] },
  { title: "Apoyo en un día difícil", description: "Se unen para cuidar del ánimo de la casa. El público celebra su empatía.", min: 3, max: 5, impact: [6, 11] },
  { title: "Malas formas", description: "Responde con desprecio a una petición cotidiana y recibe críticas del público.", min: 1, max: 1, impact: [-8, -4] },
  { title: "Tareas sin hacer", description: "Evita su turno de limpieza y deja el trabajo a los demás. La audiencia lo penaliza.", min: 1, max: 1, impact: [-5, -2] },
  { title: "Exceso de confianza", description: "Da por hecho que tiene la victoria asegurada. Sus comentarios caen mal fuera de la casa.", min: 1, max: 1, impact: [-10, -5] },
  { title: "Una mentira al descubierto", description: "Queda en evidencia al contradecir su propia versión de los hechos. Pierde credibilidad ante el público.", min: 1, max: 1, impact: [-14, -8] },
  { title: "Discusión en la cocina", description: "Se enfrentan por el reparto de la comida. Las malas formas disgustan al público y dejan tensión entre ellos.", min: 2, max: 2, impact: [-9, -4], conflict: true },
  { title: "Choque por la limpieza", description: "Se reprochan las tareas pendientes en una discusión que termina con gritos.", min: 2, max: 3, impact: [-8, -3], conflict: true },
  { title: "Rumores a espaldas", description: "Difunden un rumor sin comprobarlo. La audiencia rechaza su comportamiento.", min: 2, max: 3, impact: [-11, -6] },
  { title: "Una broma que sale mal", description: "Llevan una broma demasiado lejos y no saben reconocer el error. El público muestra su descontento.", min: 2, max: 3, impact: [-10, -5] },
  { title: "La casa estalla", description: "Una discusión colectiva desborda la convivencia. Los reproches cruzados provocan un fuerte rechazo fuera.", min: 4, max: 6, impact: [-15, -9], conflict: true },
  { title: "Pacto descubierto", description: "Sale a la luz un pacto para manipular la convivencia. La audiencia castiga a sus participantes.", min: 3, max: 5, impact: [-13, -7] },
];

export function generateHouseRound(state: GameState, rand: () => number): HouseRound {
  const count = 1 + Math.floor(rand() * 4);
  const available = shuffle(templates.filter(t => t.min <= state.activeIds.length), rand);
  const events: HouseEvent[] = available.slice(0, count).map(template => {
    const max = Math.min(template.max, state.activeIds.length);
    const size = template.min + Math.floor(rand() * (max - template.min + 1));
    const participantIds = shuffle(state.activeIds, rand).slice(0, size);
    const changes = participantIds.map(id => {
      const before = state.popularity[id];
      const delta = template.impact[0] + Math.floor(rand() * (template.impact[1] - template.impact[0] + 1));
      const after = Math.max(0, Math.min(100, before + delta));
      state.popularity[id] = after;
      return { id, before, after, delta: after - before };
    });
    return { title: template.title, description: template.description, participantIds, changes,
      positive: template.impact[0] > 0, conflict: !!template.conflict };
  });
  return { galaNumber: state.gala, events, popularity: { ...state.popularity }, activeIds: [...state.activeIds] };
}

/** Popularity changes the odds, never guarantees a result. The final is a vote to win. */
export function audiencePercents(ids: string[], popularity: Record<string, number>, rand: () => number, final = false) {
  const weights = ids.map(id => (0.05 - Math.log(Math.max(1e-12, 1 - rand()))) * Math.exp((final ? 1 : -1) * ((popularity[id] ?? 50) - 50) / 30));
  const sum = weights.reduce((a, b) => a + b, 0);
  const units = weights.map(weight => weight / sum * 1000);
  const rounded = units.map(Math.floor);
  const remainderOrder = ids.map((_, i) => i).sort((a, b) => (units[b] - rounded[b]) - (units[a] - rounded[a]));
  for (let i = 0, remaining = 1000 - rounded.reduce((a, b) => a + b, 0); i < remaining; i++) rounded[remainderOrder[i]]++;
  return Object.fromEntries(ids.map((id, i) => [id, rounded[i] / 10]));
}

export function nominationTargets(fromId: string, eligible: string[], count: number, events: HouseEvent[], rand: () => number) {
  const rivals = new Set(events.filter(e => e.conflict && e.participantIds.includes(fromId)).flatMap(e => e.participantIds));
  const pool = [...eligible];
  const chosen: string[] = [];
  while (chosen.length < count && pool.length) {
    const weights = pool.map(id => rivals.has(id) ? 8 : 1);
    let ticket = rand() * weights.reduce((a, b) => a + b, 0);
    let index = 0;
    while (index < pool.length - 1 && ticket >= weights[index]) ticket -= weights[index++];
    chosen.push(pool.splice(index, 1)[0]);
  }
  return chosen;
}
