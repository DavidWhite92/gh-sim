"use client";

import { useRouter } from "next/navigation";
import { ContestantPicker } from "@/components/ContestantPicker";
import type { ContestantInput } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="homePage">
      <ContestantPicker
        onStart={(contestants: ContestantInput[], seed: number, options: { repechage: boolean }) => {
          const payload = encodeURIComponent(JSON.stringify({ contestants, seed, repechage: options.repechage }));
          router.push(`/simulator?setup=${payload}`);
        }}
      />
    </div>
  );
}