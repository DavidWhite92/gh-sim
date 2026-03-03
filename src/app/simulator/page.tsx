import { Suspense } from "react";
import SimulatorClient from "./SimulatorClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="card cardPad">Cargando…</div>}>
      <SimulatorClient />
    </Suspense>
  );
}
