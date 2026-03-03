"use client";

import { useRouter } from "next/navigation";
import { ContestantPicker } from "@/components/ContestantPicker";
import type { ContestantInput } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();

  return (
    <main style={{ padding: 20, display: "grid", gap: 16 }}>
      <ContestantPicker
        onStart={(contestants: ContestantInput[], seed: number) => {
          const payload = encodeURIComponent(JSON.stringify({ contestants, seed }));
          router.push(`/simulator?setup=${payload}`);
        }}
      />
    </main>
  );
}