"use client";

import { SceneBackground } from "@/components/SceneBackground";
import { useRouter } from "next/navigation";
import { ContestantPicker } from "@/components/ContestantPicker";
import type { ContestantInput, GameOptions } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="homePage">
      <SceneBackground scene="plato" />
      <ContestantPicker
        onStart={(contestants: ContestantInput[], seed: number, options: GameOptions) => {
          const payload = encodeURIComponent(JSON.stringify({ contestants, seed, ...options }));
          router.push(`/simulator?setup=${payload}`);
        }}
      />
    </div>
  );
}