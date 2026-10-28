"use client";

import type { Contestant } from "@/lib/types";

export function ContestantPortrait({ contestant }: { contestant?: Contestant }) {
  if (!contestant) return null;
  const slug = contestant.name.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const src = contestant.photoUrl || (contestant.seasonId ? `/${contestant.seasonId}/${slug}.jpg` : "");
  if (!src) return null;
  return <img src={src} alt={contestant.name} width={120} height={120}
    style={{ display: "block", width: 120, height: 120, objectFit: "cover", borderRadius: 16, margin: "14px auto", filter: "none" }}
    onError={event => {
      const img = event.currentTarget;
      if (img.dataset.fallbackApplied) return;
      img.dataset.fallbackApplied = "1";
      if (src.toLowerCase().endsWith(".jpg")) img.src = src.replace(/\.jpg$/i, ".png");
    }} />;
}
