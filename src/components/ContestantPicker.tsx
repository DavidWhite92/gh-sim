"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContestantSetup, Gender } from "@/lib/types";

type SeasonDef = {
  id: string; // "gh1"..."gh10" | "custom"
  label: string;
  contestants: Array<{ name: string; file?: string; gender?: Gender }>;
};

type CustomStored = {
  name: string;
  photoUrl: string;
  gender?: Gender;
};

const CUSTOM_SEASON_ID = "custom";
const LS_KEY = "ghsim_custom_contestants_v1";

function slugifyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildPhotoUrl(seasonId: string, name: string, file?: string) {
  if (file) return `/${seasonId}/${file}`;
  return `/${seasonId}/${slugifyName(name)}.jpg`;
}

function normalizeGender(g?: Gender): Gender {
  return g === "M" || g === "F" || g === "X" ? g : "X";
}

function uniqueName(desired: string, existing: Set<string>) {
  if (!existing.has(desired)) return desired;
  let i = 2;
  while (existing.has(`${desired} (${i})`)) i++;
  return `${desired} (${i})`;
}

/**
 * Rellena aquí los concursantes reales por edición.
 * Fotos: public/gh1, public/gh2 ... public/gh10
 * Por defecto: /<seasonId>/<slug>.jpg (con fallback a .png si falla)
 */

const SEASONS: SeasonDef[] = [
  {
    id: "gh1",
    label: "GH 1",
    contestants: [
      { name: "Ismael", file: "Ismael.gif", gender: "M" },
      { name: "Ania", file: "Ania.gif", gender: "F" },
      { name: "Iván A.", file: "IvanArmesto.gif", gender: "M" },
      { name: "Koldo", file: "Koldo.gif", gender: "M" },
      { name: "Mabel", file: "Mabel.gif", gender: "F" },
      { name: "Íñigo", file: "Iñigo.gif", gender: "M" },
      { name: "Marina", file: "Marina.gif", gender: "F" },
      { name: "Vanessa", file: "Vanessa.gif", gender: "F" },
      { name: "Mónica", file: "Monica.gif", gender: "F" },
      { name: "Nacho", file: "NachoRodriguez.gif", gender: "M" },
      { name: "Jorge", file: "JorgeBerrocal.gif", gender: "M" },
      { name: "Silvia", file: "Silvia.gif", gender: "F" },
      { name: "Israel", file: "Israel.gif", gender: "M" },
      { name: "María José", file: "MariaJose.gif", gender: "F" },
    ],
  },
  {
    id: "gh2",
    label: "GH 2",
    contestants: [
      { name: "Sabrina", file: "Sabrina.gif", gender: "F" },
      { name: "Fran", file: "Fran.gif", gender: "M" },
      { name: "Mari", file: "Mari.gif", gender: "F" },
      { name: "Ángel T.", file: "Angel Tous.gif", gender: "M" },
      { name: "Kaiet", file: "Kaiet.gif", gender: "M" },
      { name: "Alonso", file: "Alonso.gif", gender: "M" },
      { name: "Eva P.", file: "Eva Paz.gif", gender: "F" },
      { name: "Emilio", file: "Emilio.gif", gender: "M" },
      { name: "Karola", file: "Karola.gif", gender: "F" },
      { name: "Roberto", file: "Roberto.gif", gender: "M" },
      { name: "Fayna", file: "Fayna.gif", gender: "F" },
      { name: "Carlos", file: "Carlos Yoyas.gif", gender: "M" },
      { name: "Marta L.", file: "Marta Lopez GH2.gif", gender: "F" },
    ],
  },
  {
    id: "gh3",
    label: "GH 3",
    contestants: [
      { name: "Javito", file: "Javito.gif", gender: "M" },
      { name: "Patricia L.", file: "Patricia Ledesma.gif", gender: "F" },
      { name: "Kiko", file: "Kiko H.gif", gender: "M" },
      { name: "Javier E.", file: "Javier Estrada.gif", gender: "M" },
      { name: "Carolina G.", file: "Carolina.gif", gender: "F" },
      { name: "Candi", file: "Candi.gif", gender: "F" },
      { name: "Óscar M.", file: "Oscar.gif", gender: "M" },
      { name: "Jorge M.", file: "Jorge Mozo.gif", gender: "M" },
      { name: "Elba", file: "Elba.gif", gender: "F" },
      { name: "Ness", file: "Ness.gif", gender: "M" },
      { name: "Raquel M.", file: "Raquel Morillas.gif", gender: "F" },
      { name: "Jacinto", file: "Jacinto.gif", gender: "M" },
      { name: "Noemí U.", file: "Noemi.gif", gender: "F" },
    ],
  },
  {
    id: "gh4",
    label: "GH 4",
    contestants: [
      { name: "Pedro", file: "Pedro.gif", gender: "M" },
      { name: "Désirée", file: "Desiree.gif", gender: "F" },
      { name: "Rafa", file: "Rafa.gif", gender: "M" },
      { name: "Nacho", file: "Nacho.gif", gender: "M" },
      { name: "Matías", file: "Matias.gif", gender: "M" },
      { name: "Inma", file: "Inma.gif", gender: "F" },
      { name: "Rocío", file: "Rocio.gif", gender: "F" },
      { name: "Gustavo", file: "Gustavo.gif", gender: "M" },
      { name: "Judith", file: "Judith.gif", gender: "F" },
      { name: "Anna", file: "Anna.gif", gender: "F" },
      { name: "Mario", file: "Mario.gif", gender: "M" },
      { name: "Sonia", file: "Sonia Arenas.gif", gender: "F" },
      { name: "María M.", file: "Maria.gif", gender: "F" },
    ],
  },
  {
    id: "gh5",
    label: "GH 5",
    contestants: [
      { name: "Nuria N.", file: "Nuria.gif", gender: "F" },
      { name: "David G.", file: "David Gallardo.gif", gender: "M" },
      { name: "Julián", file: "Julian.gif", gender: "M" },
      { name: "Ainhoa", file: "Ainhoa.gif", gender: "F" },
      { name: "Denis", file: "Denis.gif", gender: "M" },
      { name: "Laura U.", file: "Laura Ureña.gif", gender: "F" },
      { name: "Nico", file: "Nico.gif", gender: "M" },
      { name: "Ramón", file: "Ramon.gif", gender: "M" },
      { name: "Vanessa G.", file: "Vanessa Galindo.gif", gender: "F" },
      { name: "Bea C.", file: "Bea Cardenas.gif", gender: "F" },
      { name: "Carla", file: "Carla.gif", gender: "F" },
      { name: "Luhay", file: "Luhay.gif", gender: "M" },
      { name: "Aída", file: "Aida.gif", gender: "F" },
    ],
  },
  {
    id: "gh6",
    label: "GH 6",
    contestants: [
      { name: "Juanjo", file: "Juanjo.gif", gender: "M" },
      { name: "Conrad", file: "Conrad.gif", gender: "M" },
      { name: "Natacha", file: "Natacha.gif", gender: "F" },
      { name: "Diana", file: "Diana.gif", gender: "F" },
      { name: "Jani", file: "Jani.gif", gender: "F" },
      { name: "Eva", file: "Evagh6.gif", gender: "F" },
      { name: "Jonathan", file: "Jonathan.gif", gender: "M" },
      { name: "Nicky", file: "Nicky.gif", gender: "M" },
      { name: "Bea G.", file: "Bea González.gif", gender: "F" },
      { name: "Miguel C.", file: "Miguel.gif", gender: "M" },
      { name: "Sandra", file: "Sandra.gif", gender: "F" },
      { name: "Cristal", file: "Cristal.gif", gender: "F" },
      { name: "Eloísa", file: "Eloisa.gif", gender: "F" },
      { name: "Ángel D.", file: "Angelgh6.gif", gender: "M" },
      { name: "Salva", file: "Salva.gif", gender: "M" },
      { name: "Mercedes", file: "Mercedes.gif", gender: "F" },
    ],
  },
  {
    id: "gh7",
    label: "GH 7",
    contestants: [
      { name: "Pepe", file: "Pepe.gif", gender: "M" },
      { name: "Javi", file: "Javi.gif", gender: "M" },
      { name: "Raquel A.", file: "Raquel Abad.gif", gender: "F" },
      { name: "Dayron", file: "Dayron.gif", gender: "M" },
      { name: "Raquel L.", file: "Raquel Lopez.gif", gender: "F" },
      { name: "Jesús", file: "Jesus.gif", gender: "M" },
      { name: "Sara", file: "Sara.gif", gender: "F" },
      { name: "Arturo", file: "Arturo.gif", gender: "M" },
      { name: "Toño", file: "Tono.gif", gender: "M" },
      { name: "Saray", file: "Saray.gif", gender: "F" },
      { name: "Mayte", file: "Mayte.gif", gender: "F" },
      { name: "Inma", file: "Inma Contreras.gif", gender: "F" },
      { name: "Beatriz G.", file: "Beatriz Gomez.gif", gender: "F" },
      { name: "Estrella", file: "Estrella.gif", gender: "F" },
    ],
  },
  {
    id: "gh8",
    label: "GH 8",
    contestants: [
      { name: "Naiala", file: "Naiala.gif", gender: "F" },
      { name: "Laura F.", file: "Laura Fernandez.gif", gender: "F" },
      { name: "Mimi", file: "Mimi.gif", gender: "F" },
      { name: "Pulpillo", file: "Pulpillo.gif", gender: "M" },
      { name: "Mahme", file: "Mahme.gif", gender: "F" },
      { name: "Dani L.", file: "Dani Lopez.gif", gender: "M" },
      { name: "Dani R.", file: "Dani Rubio.gif", gender: "M" },
      { name: "Kiran", file: "Kiran.gif", gender: "M" },
      { name: "Javier R.", file: "Javier Robles.gif", gender: "M" },
      { name: "Greta", file: "Greta.gif", gender: "F" },
      { name: "Marusky", file: "Marusky.gif", gender: "F" },
      { name: "Kiko", file: "Kikogh8.gif", gender: "M" },
      { name: "Gemma", file: "Gemma.gif", gender: "F" },
      { name: "Laura S.", file: "Laura Sevillano.gif", gender: "F" },
    ],
  },
  {
    id: "gh9",
    label: "GH 9",
    contestants: [
      { name: "Judit", file: "Judit.gif", gender: "F" },
      { name: "Gemelas", file: "Gemelas.gif", gender: "F" },
      { name: "Rodrigo", file: "Rodrigo.gif", gender: "M" },
      { name: "Oliver", file: "Oliver.gif", gender: "M" },
      { name: "Ángela L.", file: "Ángela.gif", gender: "F" },
      { name: "Eneko", file: "Eneko.gif", gender: "M" },
      { name: "Andalla", file: "Andalla.gif", gender: "M" },
      { name: "Melania", file: "Melania.gif", gender: "F" },
      { name: "Amor", file: "Amor.gif", gender: "F" },
      { name: "Piero", file: "Piero.gif", gender: "M" },
      { name: "Lucy", file: "Lucy.gif", gender: "F" },
      { name: "Dadi", file: "Dadi.gif", gender: "M" },
      { name: "Karen", file: "Karen.gif", gender: "F" },
      { name: "Paula P.", file: "Paula Pérez.gif", gender: "F" },
      { name: "Fleky", file: "Fleky.gif", gender: "M" },
      { name: "Rebeca", file: "Rebeca.gif", gender: "F" },
      { name: "Maite", file: "Maitegh9.gif", gender: "F" },
    ],
  },
  {
    id: "gh10",
    label: "GH 10",
    contestants: [
      { name: "Iván", file: "Ivan.gif", gender: "M" },
      { name: "Orlando", file: "Orlando.gif", gender: "M" },
      { name: "Almudena", file: "Almudena.gif", gender: "F" },
      { name: "Liz", file: "Liz.gif", gender: "F" },
      { name: "Julito", file: "Julito.gif", gender: "M" },
      { name: "Palomares", file: "Palomares.gif", gender: "M" },
      { name: "Ana T.", file: "Ana Toro.gif", gender: "F" },
      { name: "Mirentxu", file: "Mirentxu.gif", gender: "F" },
      { name: "Carlos F.", file: "Carlos Fernandez.gif", gender: "M" },
      { name: "Gisela", file: "Gisela.gif", gender: "F" },
      { name: "Nani", file: "Nani.gif", gender: "F" },
      { name: "Loli", file: "Loli.gif", gender: "F" },
      { name: "Carlos H.", file: "Carlos Hoya.gif", gender: "M" },
      { name: "Gema", file: "Gema.gif", gender: "F" },
      { name: "Li", file: "Li.gif", gender: "F" },
      { name: "Raquel G.", file: "Raquel Gomez.gif", gender: "F" },
      { name: "Eva F.", file: "Eva Freire.gif", gender: "F" },
      { name: "Germán", file: "German.gif", gender: "M" },
    ],
  },
  {
    id: "gh11",
    label: "GH 11",
    contestants: [
      { name: "Ángel M.", file: "AngelGh11.gif", gender: "M" },
      { name: "Saray", file: "Saraygh11.gif", gender: "F" },
      { name: "Pilarita", file: "Pilarita.gif", gender: "F" },
      { name: "Gerardo", file: "Gerardogh11.gif", gender: "M" },
      { name: "Tatiana", file: "Tatiana.gif", gender: "F" },
      { name: "Arturo", file: "ArturoGh11.gif", gender: "M" },
      { name: "Siscu", file: "Siscu.gif", gender: "M" },
      { name: "Laura", file: "Lauragh11.gif", gender: "F" },
      { name: "Carol", file: "Carol.gif", gender: "F" },
      { name: "Toscano", file: "Toscano.gif", gender: "M" },
      { name: "Indhira", file: "Indhira.gif", gender: "F" },
      { name: "Carolina S.", file: "CarolinaSobe.gif", gender: "F" },
      { name: "Hans", file: "Hans.gif", gender: "M" },
      { name: "Melanie", file: "Melanie.gif", gender: "F" },
      { name: "Juan", file: "Juangh11.gif", gender: "M" },
      { name: "Rebeca", file: "Rebecagh11.gif", gender: "F" },
      { name: "Nagore", file: "Nagore.gif", gender: "F" },
      { name: "Lis", file: "Lis.gif", gender: "F" },
      { name: "Ángela", file: "Angelagh11.gif", gender: "F" },
      { name: "Gonzalo", file: "Gonzalogh11.gif", gender: "M" },
    ],
  },
  {
    id: "gh12",
    label: "GH 12",
    contestants: [
      { name: "Laura C.", file: "LauraCampos.gif", gender: "F" },
      { name: "Yago", file: "Yago.gif", gender: "M" },
      { name: "Marcelo", file: "Marcelo.gif", gender: "M" },
      { name: "Martha", file: "Martha.gif", gender: "F" },
      { name: "Dámaso", file: "Dámaso.gif", gender: "M" },
      { name: "Lydia", file: "Lydia.gif", gender: "F" },
      { name: "Rubén E.", file: "Rubengh12.gif", gender: "M" },
      { name: "Terry", file: "Terry.gif", gender: "F" },
      { name: "Cathaysa", file: "Cathaysa.gif", gender: "F" },
      { name: "Patricia", file: "Patriciagh12.gif", gender: "F" },
      { name: "Jhota", file: "Jhota.gif", gender: "M" },
      { name: "Anup", file: "Anup.gif", gender: "M" },
      { name: "Chari", file: "Chari.gif", gender: "F" },
      { name: "Arturo S.", file: "Arturogh12.gif", gender: "M" },
      { name: "Pepa", file: "Pepa.gif", gender: "F" },
      { name: "Joaquín", file: "Joaquin.gif", gender: "M" },
      { name: "Eduardo", file: "Eduardogh12.gif", gender: "M" },
      { name: "Julia V.", file: "JuliaGh12.gif", gender: "F" },
      { name: "Mireia", file: "Mireiagh12.gif", gender: "F" },
      { name: "Flor", file: "Flor.gif", gender: "F" },
      { name: "Feroz", file: "Juliogh12.gif", gender: "M" },
      { name: "Óscar C.", file: "Oscargh12.gif", gender: "M" },
    ],
  },
  {
    id: "gh13",
    label: "GH 12+1",
    contestants: [
      { name: "Pepe F.", file: "PepeFlores.gif", gender: "M" },
      { name: "María S.", file: "Mariagh13.gif", gender: "F" },
      { name: "Dani S.", file: "Danigh13.gif", gender: "M" },
      { name: "Alessandro", file: "Alessandro.gif", gender: "M" },
      { name: "Sindia", file: "Sindia.gif", gender: "F" },
      { name: "Hugo P.", file: "Hugogh13.gif", gender: "M" },
      { name: "Ariadna", file: "Ariadnagh13.gif", gender: "F" },
      { name: "Noemí M.", file: "Noemigh13.gif", gender: "F" },
      { name: "Cristian V.", file: "Cristiangh13.gif", gender: "M" },
      { name: "Marta S.", file: "Martagh13.gif", gender: "F" },
      { name: "Sergio", file: "Sergiogh13.gif", gender: "M" },
      { name: "Juan A.", file: "Juangh13.gif", gender: "M" },
      { name: "Berta", file: "Berta.gif", gender: "F" },
      { name: "Michael", file: "Michael.gif", gender: "M" },
      { name: "Ochoa", file: "Ochoa.gif", gender: "F" },
      { name: "Verónica", file: "Veronicagh13.gif", gender: "F" },
      { name: "Mary Joy", file: "MaryJoy.gif", gender: "F" },
      { name: "David", file: "Davidgh13.gif", gender: "M" },
      { name: "Aris", file: "Aris.gif", gender: "M" },
      { name: "Azucena", file: "Azucena.gif", gender: "F" },
      { name: "Zulema", file: "Zulema.gif", gender: "F" },
    ],
  },
];


export function ContestantPicker({
  onStart,
}: {
  onStart: (contestants: ContestantSetup[], seed: number) => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ContestantSetup[]>([]);
  const [seed, setSeed] = useState<number>(() => Date.now());

  // Persisted custom contestants
  const [customList, setCustomList] = useState<CustomStored[]>([]);
  const [customHydrated, setCustomHydrated] = useState(false);


  // Create / edit custom form
  const [customName, setCustomName] = useState("");
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");
  const [customGender, setCustomGender] = useState<Gender>("X");
  const [editingCustomName, setEditingCustomName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const cleaned: CustomStored[] = parsed
        .filter((x: any) => x && typeof x.name === "string" && typeof x.photoUrl === "string")
        .map((x: any) => ({
          name: x.name,
          photoUrl: x.photoUrl,
          gender: normalizeGender(x.gender),
        }));
      setCustomList(cleaned);
    } catch {
      // ignore
    }
    setCustomHydrated(true);
  }, []);

  useEffect(() => {
    if (!customHydrated) return;

    try {
      localStorage.setItem(LS_KEY, JSON.stringify(customList));
    } catch {
      // ignore
    }
  }, [customList, customHydrated]);

  const canStart = selected.length >= 10 && selected.length <= 20;

  const selectedKeySet = useMemo(() => {
    return new Set(selected.map((c) => `${c.seasonId ?? ""}::${c.name}`));
  }, [selected]);

  const seasonsWithCustom = useMemo((): SeasonDef[] => {
    return [
      ...SEASONS,
      {
        id: CUSTOM_SEASON_ID,
        label: "Custom",
        contestants: customList.map((c) => ({ name: c.name, gender: c.gender })),
      },
    ];
  }, [customList, customHydrated]);

  function countSelectedForSeason(sid: string) {
    return selected.reduce((acc, c) => acc + (c.seasonId === sid ? 1 : 0), 0);
  }

  function togglePick(setup: ContestantSetup) {
    const key = `${setup.seasonId ?? ""}::${setup.name}`;
    const exists = selectedKeySet.has(key);

    if (exists) {
      setSelected((prev) => prev.filter((c) => `${c.seasonId ?? ""}::${c.name}` !== key));
      return;
    }

    if (selected.length >= 20) return;
    setSelected((prev) => [...prev, setup]);
  }

  function makeSetupFromSeasonPerson(sid: string, p: { name: string; file?: string; gender?: Gender }): ContestantSetup {
    return {
      name: p.name,
      seasonId: sid,
      photoUrl: buildPhotoUrl(sid, p.name, p.file),
      gender: normalizeGender(p.gender),
    };
  }

  function addCustomToLibrary() {
    const rawName = customName.trim();
    const url = customPhotoUrl.trim();
    if (!rawName || !url) return;

    if (editingCustomName) {
      const names = new Set(customList.map((c) => c.name));
      names.delete(editingCustomName);
      const finalName = uniqueName(rawName, names);

      const newEntry: CustomStored = {
        name: finalName,
        photoUrl: url,
        gender: normalizeGender(customGender),
      };

      setCustomList((prev) => prev.map((c) => (c.name === editingCustomName ? newEntry : c)));
      setSelected((prev) =>
        prev.map((c) => {
          if (c.seasonId !== CUSTOM_SEASON_ID) return c;
          if (c.name !== editingCustomName) return c;
          return { ...c, name: finalName, photoUrl: newEntry.photoUrl, gender: newEntry.gender };
        })
      );

      setEditingCustomName(null);
      setCustomName("");
      setCustomPhotoUrl("");
      setCustomGender("X");
      return;
    }

    const names = new Set(customList.map((c) => c.name));
    const finalName = uniqueName(rawName, names);

    const newEntry: CustomStored = {
      name: finalName,
      photoUrl: url,
      gender: normalizeGender(customGender),
    };

    setCustomList((prev) => [newEntry, ...prev]);
    setCustomName("");
    setCustomPhotoUrl("");
    setCustomGender("X");
  }

  function startEditCustom(c: CustomStored) {
    setEditingCustomName(c.name);
    setCustomName(c.name);
    setCustomPhotoUrl(c.photoUrl);
    setCustomGender(normalizeGender(c.gender));
  }

  function cancelEditCustom() {
    setEditingCustomName(null);
    setCustomName("");
    setCustomPhotoUrl("");
    setCustomGender("X");
  }

  function deleteCustom(name: string) {
    setCustomList((prev) => prev.filter((c) => c.name !== name));
    setSelected((prev) => prev.filter((c) => !(c.seasonId === CUSTOM_SEASON_ID && c.name === name)));
    if (editingCustomName === name) cancelEditCustom();
  }

  function removeSelected(idx: number) {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
  }

  function pickRandom() {
    if (selected.length >= 20) return;

    const pool: ContestantSetup[] = [];
    for (const s of SEASONS) {
      for (const p of s.contestants) {
        pool.push(makeSetupFromSeasonPerson(s.id, p));
      }
    }
    for (const c of customList) {
      pool.push({
        name: c.name,
        seasonId: CUSTOM_SEASON_ID,
        photoUrl: c.photoUrl,
        gender: normalizeGender(c.gender),
      });
    }

    const available = pool.filter((x) => !selectedKeySet.has(`${x.seasonId ?? ""}::${x.name}`));
    if (available.length === 0) return;

    const chosen = available[Math.floor(Math.random() * available.length)];
    setSelected((prev) => [...prev, chosen]);
  }

  function onLoadEditionCode() {
    const pasted = window.prompt("Pega aquí el código de edición para cargarla:", "");
    if (!pasted) return;
    router.push(`/simulator?code=${encodeURIComponent(pasted.trim())}`);
  }

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 980 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>Simulador Gran Hermano</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <strong>Semilla</strong>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
            style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd", width: 240 }}
          />
        </label>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>
            Seleccionados: <b>{selected.length}</b> (mín 10 / máx 20)
          </span>

          <button
            onClick={pickRandom}
            disabled={selected.length >= 20}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #ddd",
              cursor: selected.length >= 20 ? "not-allowed" : "pointer",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
            }}
          >
            Random
          </button>

          <button
            onClick={onLoadEditionCode}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #ddd",
              cursor: "pointer",
              background: "#fff",
              fontWeight: 800,
            }}
          >
            Cargar
          </button>

          <button
            disabled={!canStart}
            onClick={() => onStart(selected, seed)}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #ddd",
              cursor: canStart ? "pointer" : "not-allowed",
              background: canStart ? "#111" : "#999",
              color: "#fff",
              fontWeight: 800,
            }}
          >
            Empezar
          </button>
        </div>
      </div>

      <section style={{ border: "1px solid #eee", borderRadius: 16, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
          <strong style={{ fontSize: 16 }}>Roster</strong>
          <span style={{ opacity: 0.7, fontSize: 13 }}>(clic en una tarjeta para quitar)</span>
        </div>

        {selected.length === 0 ? (
          <div style={{ opacity: 0.75 }}>Aún no has seleccionado concursantes.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
            {selected.map((c, idx) => (
              <button
                key={`${c.seasonId}::${c.name}::${idx}`}
                onClick={() => removeSelected(idx)}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  textAlign: "left",
                  padding: 10,
                  borderRadius: 14,
                  border: "1px solid #e6e6e6",
                  background: "#fff",
                  cursor: "pointer",
                }}
                title="Quitar"
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#f3f3f3",
                    border: "1px solid #eee",
                    flex: "0 0 auto",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.photoUrl}
                    alt={c.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.dataset.fallbackApplied) return;
                      img.dataset.fallbackApplied = "1";
                      if (c.photoUrl?.toLowerCase().endsWith(".jpg")) {
                        img.src = c.photoUrl.replace(/\.jpg$/i, ".png");
                      }
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 2 }}>
                  <div style={{ fontWeight: 850 }}>{c.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{(c.seasonId ?? "").toUpperCase()}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section style={{ border: "1px solid #eee", borderRadius: 16, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
          <strong style={{ fontSize: 16 }}>Concursantes</strong>
          <span style={{ opacity: 0.7, fontSize: 13 }}>(abre/cierra y clic para añadir/quitar)</span>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {seasonsWithCustom.map((s, idx) => {
            const seasonSelectedCount = countSelectedForSeason(s.id);
            const total = s.id === CUSTOM_SEASON_ID ? customList.length : s.contestants.length;

            return (
              <details
                key={s.id}
                open={idx === 0 || s.id === CUSTOM_SEASON_ID}
                style={{ border: "1px solid #eee", borderRadius: 16, padding: 10, background: "#fff" }}
              >
                <summary style={{ cursor: "pointer", fontWeight: 900 }}>
                  {s.label} <span style={{ opacity: 0.7, fontWeight: 700 }}>({total} · seleccionados: {seasonSelectedCount})</span>
                </summary>

                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                    gap: 10,
                  }}
                >
                  {s.id !== CUSTOM_SEASON_ID &&
                    s.contestants.map((p) => {
                      const setup = makeSetupFromSeasonPerson(s.id, p);
                      const key = `${setup.seasonId ?? ""}::${setup.name}`;
                      const picked = selectedKeySet.has(key);

                      return (
                        <button
                          key={key}
                          onClick={() => togglePick(setup)}
                          disabled={!picked && selected.length >= 20}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            textAlign: "left",
                            padding: 10,
                            borderRadius: 14,
                            border: "1px solid #e6e6e6",
                            background: picked ? "#111" : "#fff",
                            color: picked ? "#fff" : "#111",
                            cursor: !picked && selected.length >= 20 ? "not-allowed" : "pointer",
                            opacity: !picked && selected.length >= 20 ? 0.6 : 1,
                          }}
                          title={picked ? "Quitar" : "Añadir"}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              overflow: "hidden",
                              background: picked ? "rgba(255,255,255,0.14)" : "#f3f3f3",
                              border: "1px solid rgba(0,0,0,0.08)",
                              flex: "0 0 auto",
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={setup.photoUrl}
                              alt={p.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={(e) => {
                                const img = e.currentTarget;
                                if (img.dataset.fallbackApplied) return;
                                img.dataset.fallbackApplied = "1";
                                if (setup.photoUrl?.toLowerCase().endsWith(".jpg")) {
                                  img.src = setup.photoUrl.replace(/\.jpg$/i, ".png");
                                }
                              }}
                            />
                          </div>

                          <div style={{ display: "grid", gap: 2 }}>
                            <div style={{ fontWeight: 850 }}>
                              {p.name} {picked ? "✓" : ""}
                            </div>
                            <div style={{ fontSize: 12, opacity: picked ? 0.85 : 0.7 }}>{s.label}</div>
                          </div>
                        </button>
                      );
                    })}

                  {s.id === CUSTOM_SEASON_ID &&
                    customList.map((c) => {
                      const setup: ContestantSetup = {
                        name: c.name,
                        seasonId: CUSTOM_SEASON_ID,
                        photoUrl: c.photoUrl,
                        gender: normalizeGender(c.gender),
                      };
                      const key = `${setup.seasonId ?? ""}::${setup.name}`;
                      const picked = selectedKeySet.has(key);

                      return (
                        <button
                          key={key}
                          onClick={() => togglePick(setup)}
                          disabled={!picked && selected.length >= 20}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            textAlign: "left",
                            padding: 10,
                            borderRadius: 14,
                            border: "1px solid #e6e6e6",
                            background: picked ? "#111" : "#fff",
                            color: picked ? "#fff" : "#111",
                            cursor: !picked && selected.length >= 20 ? "not-allowed" : "pointer",
                            opacity: !picked && selected.length >= 20 ? 0.6 : 1,
                          }}
                          title={picked ? "Quitar" : "Añadir"}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              overflow: "hidden",
                              background: picked ? "rgba(255,255,255,0.14)" : "#f3f3f3",
                              border: "1px solid rgba(0,0,0,0.08)",
                              flex: "0 0 auto",
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={setup.photoUrl} alt={setup.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>

                          <div style={{ display: "grid", gap: 2 }}>
                            <div style={{ fontWeight: 850 }}>
                              {setup.name} {picked ? "✓" : ""}
                            </div>
                            <div style={{ fontSize: 12, opacity: picked ? 0.85 : 0.7 }}>Custom</div>
                          </div>
                        </button>
                      );
                    })}
                </div>

                {s.id === CUSTOM_SEASON_ID && customList.length === 0 && (
                  <div style={{ marginTop: 10, opacity: 0.75 }}>Aún no tienes concursantes custom.</div>
                )}
                {s.id !== CUSTOM_SEASON_ID && s.contestants.length === 0 && (
                  <div style={{ marginTop: 10, opacity: 0.75 }}>Esta edición aún no tiene concursantes.</div>
                )}
              </details>
            );
          })}
        </div>
      </section>

      <section style={{ border: "1px solid #eee", borderRadius: 16, padding: 14 }}>
        <details open>
          <summary style={{ cursor: "pointer", fontWeight: 900 }}>
            {editingCustomName ? `Editando: ${editingCustomName}` : "Crear concursante custom"} (se guarda en tu navegador)
          </summary>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Nombre del concursante"
                style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd", width: 260 }}
              />
              <input
                value={customPhotoUrl}
                onChange={(e) => setCustomPhotoUrl(e.target.value)}
                placeholder="Link de foto (png/gif/jpg)"
                style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd", width: 420 }}
              />
              <select
                value={customGender}
                onChange={(e) => setCustomGender(e.target.value as Gender)}
                style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                aria-label="Género"
              >
                <option value="X">Sin especificar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={addCustomToLibrary}
                disabled={!customName.trim() || !customPhotoUrl.trim()}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  cursor: !customName.trim() || !customPhotoUrl.trim() ? "not-allowed" : "pointer",
                  background: "#f7f7f7",
                  fontWeight: 800,
                }}
              >
                Guardar
              </button>

              {editingCustomName && (
                <button
                  onClick={cancelEditCustom}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #ddd",
                    cursor: "pointer",
                    background: "#fff",
                    fontWeight: 800,
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>

            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Los customs se guardan en <code>localStorage</code> del navegador actual.
            </div>

            <div style={{ marginTop: 6, borderTop: "1px solid #eee", paddingTop: 10 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Mis customs</div>
              {customList.length === 0 ? (
                <div style={{ opacity: 0.75 }}>Aún no tienes concursantes custom.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {customList.map((c) => (
                    <div
                      key={c.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: 10,
                        border: "1px solid #eee",
                        borderRadius: 14,
                        background: "#fff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            overflow: "hidden",
                            background: "#f3f3f3",
                            border: "1px solid #eee",
                            flex: "0 0 auto",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={c.photoUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                          <div style={{ fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.75 }}>{c.gender ?? "X"}</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
                        <button
                          onClick={() => startEditCustom(c)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            background: "#fff",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                          title="Editar"
                          aria-label={`Editar ${c.name}`}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteCustom(c.name)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            background: "#fff",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                          title="Borrar"
                          aria-label={`Borrar ${c.name}`}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
