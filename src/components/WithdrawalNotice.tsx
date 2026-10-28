import { ContestantPortrait } from "@/components/ContestantPortrait";
import type { GameState, WithdrawalRecord } from "@/lib/types";

export function WithdrawalNotice({ state, record }: { state: GameState; record: WithdrawalRecord }) {
  const names = new Map(state.contestants.map(c => [c.id, c.name]));
  return <div>
    <h3 style={{ marginTop: 0 }}>Abandono: {names.get(record.departedId)}</h3>
    <ContestantPortrait contestant={state.contestants.find(c => c.id === record.departedId)} size={62} align="left" />
    <p>{record.phase === "after"
      ? `Tras la expulsión de ${names.get(record.followedId ?? "")}, decide marcharse también.`
      : "Después de lo vivido en la casa, decide abandonar antes de la expulsión y las nominaciones."}</p>
    <p>Entra como reserva <b>{names.get(record.replacementId)}</b>. En esta gala no puede nominar ni ser nominado.</p>
  </div>;
}
