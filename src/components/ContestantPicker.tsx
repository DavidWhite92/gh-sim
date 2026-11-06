"use client";

import { SeasonSettings } from "@/components/SeasonSettings";
import { useEffect, useMemo, useState } from "react";
import type { ContestantSetup, Gender, GameOptions } from "@/lib/types";

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
      { name: "Íñigo G.", file: "Iñigo.gif", gender: "M" },
      { name: "Marina", file: "Marina.gif", gender: "F" },
      { name: "Vanessa P.", file: "Vanessa.gif", gender: "F" },
      { name: "Mónica R.", file: "Monica.gif", gender: "F" },
      { name: "Nacho R.", file: "NachoRodriguez.gif", gender: "M" },
      { name: "Jorge B.", file: "JorgeBerrocal.gif", gender: "M" },
      { name: "Silvia C.", file: "Silvia.gif", gender: "F" },
      { name: "Israel P.", file: "Israel.gif", gender: "M" },
      { name: "Mª José", file: "MariaJose.gif", gender: "F" },
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
      { name: "Alonso J.", file: "Alonso.gif", gender: "M" },
      { name: "Eva P.", file: "Eva Paz.gif", gender: "F" },
      { name: "Emilio", file: "Emilio.gif", gender: "M" },
      { name: "Karola", file: "Karola.gif", gender: "F" },
      { name: "Roberto", file: "Roberto.gif", gender: "M" },
      { name: "Fayna", file: "Fayna.gif", gender: "F" },
      { name: "Carlos N.", file: "Carlos Yoyas.gif", gender: "M" },
      { name: "Marta L.", file: "Marta Lopez GH2.gif", gender: "F" },
    ],
  },
  {
    id: "gh3",
    label: "GH 3",
    contestants: [
      { name: "Javito", file: "Javito.gif", gender: "M" },
      { name: "Patricia L.", file: "Patricia Ledesma.gif", gender: "F" },
      { name: "Kiko H.", file: "Kiko H.gif", gender: "M" },
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
      { name: "Nacho U.", file: "Nacho.gif", gender: "M" },
      { name: "Matías", file: "Matias.gif", gender: "M" },
      { name: "Inma", file: "Inma.gif", gender: "F" },
      { name: "Rocío R.", file: "Rocio.gif", gender: "F" },
      { name: "Gustavo F.", file: "Gustavo.gif", gender: "M" },
      { name: "Judith", file: "Judith.gif", gender: "F" },
      { name: "Anna", file: "Anna.gif", gender: "F" },
      { name: "Mario", file: "Mario.gif", gender: "M" },
      { name: "Sonia A.", file: "Sonia Arenas.gif", gender: "F" },
      { name: "María M.", file: "Maria.gif", gender: "F" },
    ],
  },
  {
    id: "gh5",
    label: "GH 5",
    contestants: [
      { name: "Nuria N.", file: "Nuria.gif", gender: "F" },
      { name: "David", file: "David Gallardo.gif", gender: "M" },
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
      { name: "Eva S.", file: "Evagh6.gif", gender: "F" },
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
      { name: "Sara L.", file: "Sara.gif", gender: "F" },
      { name: "Arturo", file: "Arturo.gif", gender: "M" },
      { name: "Toño R.", file: "Tono.gif", gender: "M" },
      { name: "Saray L.", file: "Saray.gif", gender: "F" },
      { name: "Mayte S.", file: "Mayte.gif", gender: "F" },
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
      { name: "L. Sevillano", file: "Laura Sevillano.gif", gender: "F" },
    ],
  },
  {
    id: "gh9",
    label: "GH 9",
    contestants: [
      { name: "Judit", file: "Judit.gif", gender: "F" },
      { name: "Gemelas", file: "Gemelas.gif", gender: "F" },
      { name: "Rodrigo U.", file: "Rodrigo.gif", gender: "M" },
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
      { name: "Rebeca F.", file: "Rebeca.gif", gender: "F" },
      { name: "Maite F.", file: "Maitegh9.gif", gender: "F" },
    ],
  },
  {
    id: "gh10",
    label: "GH 10",
    contestants: [
      { name: "Iván M.", file: "Ivan.gif", gender: "M" },
      { name: "Orlando", file: "Orlando.gif", gender: "M" },
      { name: "Chiqui", file: "Almudena.gif", gender: "F" },
      { name: "Liz", file: "Liz.gif", gender: "F" },
      { name: "Julito", file: "Julito.gif", gender: "M" },
      { name: "Palomares", file: "Palomares.gif", gender: "M" },
      { name: "Ana Toro", file: "Ana Toro.gif", gender: "F" },
      { name: "Mirentxu", file: "Mirentxu.gif", gender: "F" },
      { name: "Carlos F.", file: "Carlos Fernandez.gif", gender: "M" },
      { name: "Gisela", file: "Gisela.gif", gender: "F" },
      { name: "Nani", file: "Nani.gif", gender: "F" },
      { name: "Loli F.", file: "Loli.gif", gender: "F" },
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
      { name: "Saray P.", file: "Saraygh11.gif", gender: "F" },
      { name: "Pilarita", file: "Pilarita.gif", gender: "F" },
      { name: "Gerardo", file: "Gerardogh11.gif", gender: "M" },
      { name: "Tatiana", file: "Tatiana.gif", gender: "F" },
      { name: "Arturo R.", file: "ArturoGh11.gif", gender: "M" },
      { name: "Siscu", file: "Siscu.gif", gender: "M" },
      { name: "Laura S.", file: "Lauragh11.gif", gender: "F" },
      { name: "Carol", file: "Carol.gif", gender: "F" },
      { name: "Toscano", file: "Toscano.gif", gender: "M" },
      { name: "Indhira", file: "Indhira.gif", gender: "F" },
      { name: "Carolina S.", file: "CarolinaSobe.gif", gender: "F" },
      { name: "Hans", file: "Hans.gif", gender: "M" },
      { name: "Melanie", file: "Melanie.gif", gender: "F" },
      { name: "Juan C.", file: "Juangh11.gif", gender: "M" },
      { name: "Rebeca P.", file: "Rebecagh11.gif", gender: "F" },
      { name: "Nagore", file: "Nagore.gif", gender: "F" },
      { name: "Lis", file: "Lis.gif", gender: "F" },
      { name: "Ángela C.", file: "Angelagh11.gif", gender: "F" },
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
      { name: "Patricia H.", file: "Patriciagh12.gif", gender: "F" },
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
      { name: "Michael R.", file: "Michael.gif", gender: "M" },
      { name: "Ochoa", file: "Ochoa.gif", gender: "F" },
      { name: "Verónica", file: "Veronicagh13.gif", gender: "F" },
      { name: "Mary Joy", file: "MaryJoy.gif", gender: "F" },
      { name: "David G.", file: "Davidgh13.gif", gender: "M" },
      { name: "Aris", file: "Aris.gif", gender: "M" },
      { name: "Azucena", file: "Azucena.gif", gender: "F" },
      { name: "Zulema", file: "Zulema.gif", gender: "F" },
    ],
  },
  {
    id: "gh14",
    label: "GH Catorce",
    contestants: [
      { name: "Susana M.", file: "SusanaMolina.gif", gender: "F" },
      { name: "Igor", file: "Igor.gif", gender: "M" },
      { name: "Desirée R.", file: "Desiréegh14.gif", gender: "F" },
      { name: "Raky", file: "Raky.gif", gender: "F" },
      { name: "Álvaro", file: "Álvarogh14.gif", gender: "M" },
      { name: "Nacho L.", file: "Nachogh14.gif", gender: "M" },
      { name: "Juan Carlos", file: "JuanCarlos.gif", gender: "M" },
      { name: "Kristian", file: "Kristian.gif", gender: "M" },
      { name: "Gemelos", file: "Gemelos.gif", gender: "M" },
      { name: "Sonia W.", file: "SoniaWalls.gif", gender: "F" },
      { name: "Saray R.", file: "Saraygh14.gif", gender: "F" },
      { name: "Yéssica", file: "Yessica.gif", gender: "F" },
      { name: "Iván P.", file: "IvanPgh14.gif", gender: "M" },
      { name: "Argi", file: "Argi.gif", gender: "F" },
      { name: "Adrián L.", file: "Adriangh14.gif", gender: "M" },
      { name: "Anabel L.", file: "Anabel.gif", gender: "F" },
      { name: "Miriam C.", file: "Miriamgh14.gif", gender: "F" },
      { name: "Noelia F.", file: "Noeliagh14.gif", gender: "F" },
      { name: "Iván G.", file: "IvanGgh14.gif", gender: "M" },
      { name: "Danny", file: "Danny.gif", gender: "M" },
      { name: "Leticia", file: "Leticiagh14.gif", gender: "F" },
      { name: "Eva G.", file: "Evagh14.gif", gender: "F" },
      { name: "Edoardo", file: "Edoardo.gif", gender: "M" },
      { name: "Lorena Edo", file: "LorenaEdo.gif", gender: "F" },
      { name: "Giuls", file: "Giuls.gif", gender: "F" },
    ],
  },
  {
    id: "gh15",
    label: "GH 15",
    contestants: [
      { name: "Paula G.", file: "Paulagh15.gif", gender: "F" },
      { name: "Alejandra", file: "Alejandra.gif", gender: "F" },
      { name: "Yolanda C.", file: "Yolandagh15.gif", gender: "F" },
      { name: "Azahara", file: "Azahara.gif", gender: "F" },
      { name: "Hugo Pérez", file: "Hugogh15.gif", gender: "M" },
      { name: "Jonathan P.", file: "Jonathangh15.gif", gender: "M" },
      { name: "Juanma F.", file: "Juanmagh15.gif", gender: "M" },
      { name: "Luis R.", file: "Luis.gif", gender: "M" },
      { name: "Francisco", file: "Francisco.gif", gender: "M" },
      { name: "Omar S.", file: "Omargh15.gif", gender: "M" },
      { name: "Vitín", file: "Vitíngh15.gif", gender: "M" },
      { name: "Loli P.", file: "Loligh15.gif", gender: "F" },
      { name: "Shaima", file: "Shaima.gif", gender: "F" },
      { name: "Alfredo", file: "Alfredo.gif", gender: "M" },
      { name: "Lucía P.", file: "Lucíagh15.gif", gender: "F" },
      { name: "Mayca P.", file: "Maycagh15.gif", gender: "F" },
      { name: "Paco", file: "Pacogh15.gif", gender: "M" },
      { name: "José C.", file: "Josegh15.gif", gender: "M" },
    ],
  },
  {
    id: "gh16",
    label: "GH 16",
    contestants: [
      { name: "Sofía S.", file: "Sofíagh16.gif", gender: "F" },
      { name: "Aritz", file: "Aritz.gif", gender: "M" },
      { name: "Niedziela", file: "Niedziela.gif", gender: "F" },
      { name: "Han", file: "Han.gif", gender: "M" },
      { name: "Marta P.", file: "Martagh16.gif", gender: "F" },
      { name: "Carlos R.", file: "Carlosgh16.gif", gender: "M" },
      { name: "Vera", file: "Vera.gif", gender: "M" },
      { name: "Ricky", file: "Rickygh16.gif", gender: "M" },
      { name: "Marina", file: "Marinagh16.gif", gender: "F" },
      { name: "Suso", file: "Suso.gif", gender: "M" },
      { name: "Raquel L.", file: "Raquelgh16.gif", gender: "F" },
      { name: "Amanda", file: "Amandagh16.gif", gender: "F" },
      { name: "Carolina V.", file: "Carolinagh16.gif", gender: "F" },
      { name: "Ivy", file: "Ivy.gif", gender: "F" },
      { name: "Quique", file: "Quique.gif", gender: "M" },
      { name: "Muti", file: "Muti.gif", gender: "M" },
      { name: "Maite G.", file: "Maitegh16.gif", gender: "F" },
    ],
  },
  {
    id: "gh17",
    label: "GH 17",
    contestants: [
      { name: "Bea Retamal", file: "BeaRetamal.gif", gender: "F" },
      { name: "Meritxell", file: "Meritxell.gif", gender: "F" },
      { name: "Rodrigo F.", file: "Rodrigogh17.gif", gender: "M" },
      { name: "Miguel V.", file: "Miguelgh17.gif", gender: "M" },
      { name: "Alain", file: "Alain.gif", gender: "M" },
      { name: "Adara", file: "Adara.gif", gender: "F" },
      { name: "Simona", file: "Simona.gif", gender: "F" },
      { name: "Clara", file: "Claragh17.gif", gender: "F" },
      { name: "Noelia", file: "Noeliagh17.gif", gender: "F" },
      { name: "Fernando", file: "Fernandogh17.gif", gender: "M" },
      { name: "Bárbara", file: "Bárbaragh17.gif", gender: "F" },
      { name: "Pol", file: "Pol.gif", gender: "M" },
      { name: "Rebeca R.", file: "Rebecagh17.gif", gender: "F" },
      { name: "Montse", file: "Montse.gif", gender: "F" },
      { name: "Candelas", file: "Candelas.gif", gender: "F" },
      { name: "Pablo", file: "Pablogh17.gif", gender: "M" },
      { name: "Álvaro", file: "Alvarogh17.gif", gender: "M" },
    ],
  },
  {
    id: "gh18",
    label: "GH Revolution",
    contestants: [
      { name: "Hugo S.", file: "Hugogh18.gif", gender: "M" },
      { name: "Rubén V.", file: "Rubéngh18.gif", gender: "M" },
      { name: "Christian.", file: "Christiangh18.gif", gender: "M" },
      { name: "Yangyang", file: "YangYang.gif", gender: "F" },
      { name: "Pilar M.", file: "Pilargh18.gif", gender: "F" },
      { name: "Miriam S.", file: "Miriamgh18.gif", gender: "F" },
      { name: "Karlos", file: "Karlosgh18.gif", gender: "M" },
      { name: "Maico", file: "Maico.gif", gender: "M" },
      { name: "Lorena G.", file: "Lorenagh18.gif", gender: "F" },
      { name: "Carlota", file: "Carlota.gif", gender: "F" },
      { name: "Mina", file: "Mina.gif", gender: "F" },
      { name: "Laura V.", file: "Lauragh18.gif", gender: "F" },
      { name: "Miguel del V.", file: "Miguelgh18.gif", gender: "M" },
      { name: "Cristian F.", file: "Cristiangh18.gif", gender: "M" },
      { name: "Daniel", file: "Danielgh18.gif", gender: "M" },
      { name: "José Mª", file: "JoseMariagh18.gif", gender: "M" },
      { name: "Juan Antonio", file: "JuanAntoniogh18.gif", gender: "M" },
      { name: "Petra", file: "Petra.gif", gender: "F" },
      { name: "Eneme", file: "Eneme.gif", gender: "M" },
      { name: "Yolanda G.", file: "Yolandagh18.gif", gender: "F" },
      { name: "Nerea Mo.", file: "Nereagh18.gif", gender: "F" },
    ],
  },
  {
    id: "gh19",
    label: "GH19",
    contestants: [
      { name: "Juan Q.", file: "Juangh19.gif", gender: "M" },
      { name: "Óscar L.", file: "Óscargh19.gif", gender: "M" },
      { name: "Ruvens", file: "Ruvens.gif", gender: "M" },
      { name: "Violeta", file: "Violeta.gif", gender: "F" },
      { name: "Edi", file: "Edi.gif", gender: "M" },
      { name: "Nerea Mi.", file: "Nereagh19.gif", gender: "F" },
      { name: "Jorge P.", file: "Jorgegh19.gif", gender: "M" },
      { name: "Maica", file: "Maica.gif", gender: "F" },
      { name: "Adrián C.", file: "Adriángh19.gif", gender: "M" },
      { name: "Daniela C.", file: "Danielagh19.gif", gender: "F" },
      { name: "Luis G.", file: "Luisgh19.gif", gender: "M" },
      { name: "Laura G.", file: "Lauragh19.gif", gender: "F" },
      { name: "Manu", file: "Manugh19.gif", gender: "M" },
      { name: "Lucía R.", file: "Lucíagh19.gif", gender: "F" },
      { name: "Javier M.", file: "Javiergh19.gif", gender: "M" },
      { name: "Vanessa B.", file: "Vanessagh19.gif", gender: "F" },
      { name: "Silvia R.", file: "Silviagh19.gif", gender: "F" },
      { name: "Maite B.", file: "Maitegh19.gif", gender: "F" },
      { name: "Elsa", file: "Elsagh19.gif", gender: "F" },
    ],
  },
  {
    id: "gh20",
    label: "GH20",
    contestants: [
      { name: "Rocío G.", file: "Rocíogh20.gif", gender: "F" },
      { name: "Cristian O.", file: "Cristiangh20.gif", gender: "M" },
      { name: "Aquilino", file: "Aquilino.gif", gender: "M" },
      { name: "Raúl", file: "Raúlgh20.gif", gender: "M" },
      { name: "Desirée T.", file: "Desiréegh20.gif", gender: "F" },
      { name: "Edurne", file: "Edurnegh20.gif", gender: "F" },
      { name: "Jonay", file: "Jonay.gif", gender: "M" },
      { name: "Aroa", file: "Aroa.gif", gender: "F" },
      { name: "Joon", file: "Joon.gif", gender: "M" },
      { name: "Patricia G.", file: "Patriciagh20.gif", gender: "F" },
      { name: "Belén M.", file: "Beléngh20.gif", gender: "F" },
      { name: "Paula Payá", file: "Paulagh20.gif", gender: "F" },
      { name: "Mamadou", file: "Mamadou.gif", gender: "M" },
      { name: "José Manuel", file: "JoseManuelgh20.gif", gender: "M" },
      { name: "Íñigo T.", file: "Íñigogh20.gif", gender: "M" },
      { name: "Almudena", file: "Almudenagh20.gif", gender: "F" },
      { name: "Lorena R.", file: "Lorenagh20.gif", gender: "F" },
      { name: "Diego", file: "Diegogh20.gif", gender: "M" },
      { name: "Sofía A.", file: "Sofíagh20.gif", gender: "F" },
      { name: "Noah", file: "Noahgh20.gif", gender: "F" },
    ],
  },
  {
    id: "ghvip1",
    label: "GH VIP 1",
    contestants: [
      { name: "Marlène", file: "Marleneghvip1.gif", gender: "F" },
      { name: "Juan Camus", file: "JuanCamusghvip1.gif", gender: "M" },
      { name: "Rody", file: "Rodyghvip1.gif", gender: "M" },
      { name: "Rosa G.", file: "Rosaghvip1.gif", gender: "F" },
      { name: "Carlos O.", file: "Carlosghvip1.gif", gender: "M" },
      { name: "Flor A.", file: "Florghvip1.gif", gender: "F" },
      { name: "Coyote", file: "Coyoteghvip1.gif", gender: "M" },
      { name: "Fabio", file: "Fabioghvip1.gif", gender: "M" },
      { name: "Yolanda M.", file: "Yolandaghvip1.gif", gender: "F" },
      { name: "Ángela C.", file: "Ángelaghvip1.gif", gender: "F" },
    ],
  },
  {
    id: "ghvip2",
    label: "GH VIP 2",
    contestants: [
      { name: "Ivonne A.", file: "Ivonneghvip2.gif", gender: "F" },
      { name: "Brito", file: "Britoghvip2.gif", gender: "M" },
      { name: "Tontxu", file: "Tontxughvip2.gif", gender: "M" },
      { name: "Rosario", file: "Rosarioghvip2.gif", gender: "F" },
      { name: "Adans", file: "Adansghvip2.gif", gender: "M" },
      { name: "Isabel", file: "Isabelghvip2.gif", gender: "F" },
      { name: "Jacqueline", file: "Jacquelineghvip2.gif", gender: "F" },
      { name: "Lalo", file: "Laloghvip2.gif", gender: "M" },
      { name: "King", file: "Kinghvip2.gif", gender: "M" },
      { name: "Martín", file: "Martínghvip2.gif", gender: "M" },
      { name: "Adi", file: "Adighvip2.gif", gender: "F" },
      { name: "Kiko M.", file: "Kikoghvip2.gif", gender: "M" },
      { name: "Lara", file: "Laraghvip2.gif", gender: "F" },
    ],
  },
  {
    id: "ghvip3",
    label: "GH VIP 3",
    contestants: [
      { name: "Belén E.", file: "Belenghvip3.gif", gender: "F" },
      { name: "Aguasantas", file: "Aguasantasghvip3.gif", gender: "F" },
      { name: "Coman", file: "Comanghvip3.gif", gender: "M" },
      { name: "Fede", file: "Fedeghvip3.gif", gender: "M" },
      { name: "Ángela P.", file: "Ángelaghvip3.gif", gender: "F" },
      { name: "Ylenia", file: "Yleniaghvip3.gif", gender: "F" },
      { name: "Ares", file: "Aresghvip3.gif", gender: "F" },
      { name: "Israel L.", file: "Israrlghvip3.gif", gender: "M" },
      { name: "Víctor", file: "Víctorghvip3.gif", gender: "M" },
      { name: "Laura C.", file: "Lauraghvip3.gif", gender: "F" },
      { name: "Kiko R.", file: "Kikoghvip3.gif", gender: "M" },
      { name: "Sandro", file: "Sandroghvip3.gif", gender: "M" },
      { name: "Olvido", file: "Olvidoghvip3.gif", gender: "F" },
      { name: "Chunguitos", file: "Chunguitos.gif", gender: "M" },
    ],
  },
  {
    id: "ghvip4",
    label: "GH VIP 4",
    contestants: [
      { name: "Laura M.", file: "Lauraghvip4.gif", gender: "F" },
      { name: "Carlos L.", file: "Carlosghvip4.gif", gender: "M" },
      { name: "Rappel", file: "Rappelghvip4.gif", gender: "M" },
      { name: "Alejandro", file: "Alejandroghvip4.gif", gender: "M" },
      { name: "Nicolás", file: "Nicolasghvip4.gif", gender: "M" },
      { name: "Raquel B.", file: "Raquelghvip4.gif", gender: "F" },
      { name: "Charlotte", file: "Charlotteghvip4.gif", gender: "F" },
      { name: "Sema", file: "Semaghvip4.gif", gender: "M" },
      { name: "Belén Roca", file: "Belénghvip4.gif", gender: "F" },
      { name: "Julián", file: "Juliánghvip4.gif", gender: "M" },
      { name: "Rosa", file: "Rosaghvip4.gif", gender: "F" },
      { name: "Javier T.", file: "Javierghvip4.gif", gender: "M" },
      { name: "Lucía H.", file: "Lucíaghvip4.gif", gender: "F" },
      { name: "Julius", file: "Juliusghvip4.gif", gender: "M" },
      { name: "Carmen L.", file: "Carmenghvip4.gif", gender: "F" },
    ],
  },
  {
    id: "ghvip5",
    label: "GH VIP 5",
    contestants: [
      { name: "Alyson", file: "Alysonghvip5.gif", gender: "F" },
      { name: "Daniela B.", file: "Danielaghvip5.gif", gender: "F" },
      { name: "Irma", file: "Irmaghvip5.gif", gender: "F" },
      { name: "Elettra", file: "Elettraghvip5.gif", gender: "F" },
      { name: "Emma", file: "Emmaghvip5.gif", gender: "F" },
      { name: "Marco", file: "Marcoghvip5.gif", gender: "M" },
      { name: "Aylén", file: "Aylénghvip5.gif", gender: "F" },
      { name: "Ivonne R.", file: "Ivonneghvip5.gif", gender: "F" },
      { name: "Sergio A.", file: "Sergioghvip5.gif", gender: "M" },
      { name: "Alejandro A.", file: "Alejandroghvip5.gif", gender: "M" },
      { name: "Aless", file: "Alessghvip5.gif", gender: "M" },
      { name: "Alonso C.", file: "Alonsoghvip5.png", gender: "M" },
      { name: "Tutto", file: "Tuttoghvip5.gif", gender: "M" },
      { name: "Toño S.", file: "Toñoghvip5.gif", gender: "M" },
    ],
  },
  {
    id: "ghvip6",
    label: "GH VIP 6",
    contestants: [
      { name: "Miriam", file: "Miriamghvip6.gif", gender: "F" },
      { name: "Koala", file: "Koalaghvip6.gif", gender: "M" },
      { name: "Asraf", file: "Asrafghvip6.gif", gender: "M" },
      { name: "Mónica H.", file: "Monicaghvip6.gif", gender: "F" },
      { name: "Tony Spina", file: "Tonyghvip6.gif", gender: "M" },
      { name: "Aurah", file: "Aurahghvip6.gif", gender: "F" },
      { name: "Makoke", file: "Makokeghvip6.gif", gender: "F" },
      { name: "Ángel Garó", file: "Ángelghvip6.gif", gender: "M" },
      { name: "Verdeliss", file: "Verdelissghvip6.gif", gender: "F" },
      { name: "Darek", file: "Darekghvip6.gif", gender: "M" },
      { name: "Techi", file: "Techighvip6.gif", gender: "F" },
      { name: "Omar M.", file: "Omarghvip6.gif", gender: "M" },
      { name: "Aramís", file: "Aramísghvip6.gif", gender: "F" },
      { name: "Isa", file: "Isaghvip6.gif", gender: "F" },
      { name: "Oriana", file: "Orianaghvip6.gif", gender: "F" },
    ],
  },
  {
    id: "ghvip7",
    label: "GH VIP 7",
    contestants: [
      { name: "Alba", file: "Albaghvip7.gif", gender: "F" },
      { name: "Mila", file: "Milaghvip7.gif", gender: "F" },
      { name: "Noemí S.", file: "Noemíghvip7.gif", gender: "F" },
      { name: "Estela", file: "Estelaghvip7.gif", gender: "F" },
      { name: "A. David", file: "AntonioDavidghvip7.gif", gender: "M" },
      { name: "Hugo C.", file: "Hugoghvip7.gif", gender: "M" },
      { name: "Benita", file: "Benitaghvip7.gif", gender: "F" },
      { name: "Gianmarco", file: "Gianmarcoghvip7.gif", gender: "M" },
      { name: "El Cejas", file: "Cejasghvip7.gif", gender: "M" },
      { name: "Irene J.", file: "Ireneghvip7.gif", gender: "F" },
      { name: "Kiko J.", file: "Kikoghvip7.gif", gender: "M" },
      { name: "Dinio", file: "Dinioghvip7.gif", gender: "M" },
      { name: "Nuria M.", file: "Nuriaghvip7.gif", gender: "F" },
      { name: "Anabel", file: "Anabelghvip7.gif", gender: "F" },
    ],
  },
  {
    id: "ghvip8",
    label: "GH VIP 8",
    contestants: [
      { name: "Naomi", file: "Naomighvip8.gif", gender: "F" },
      { name: "Luitingo", file: "Luitingoghvip8.gif", gender: "M" },
      { name: "Albert", file: "Albertghvip8.gif", gender: "M" },
      { name: "Laura Bozzo", file: "Lauraghvip8.gif", gender: "F" },
      { name: "Michael T.", file: "Michaelghvip8.gif", gender: "M" },
      { name: "Carmen A.", file: "Carmenghvip8.gif", gender: "F" },
      { name: "Pilar L.", file: "Pilarghvip8.gif", gender: "F" },
      { name: "Jessica", file: "Jessicaghvip8.gif", gender: "F" },
      { name: "Zeus", file: "Zeusghvip8.gif", gender: "M" },
      { name: "Susana B.", file: "Susanaghvip8.gif", gender: "F" },
      { name: "Marta C.", file: "Martaghvip8.gif", gender: "F" },
      { name: "Gustavo G.", file: "Gustavoghvip8.gif", gender: "M" },
      { name: "Alex", file: "Alexghvip8.gif", gender: "M" },
      { name: "Javier F.", file: "Javierghvip8.gif", gender: "M" },
      { name: "Karina", file: "Karinaghvip8.gif", gender: "F" },
      { name: "Sol", file: "Solghvip8.gif", gender: "F" },
      { name: "Luca", file: "Lucaghvip8.gif", gender: "M" },
      { name: "Pedro G.", file: "Pedroghvip8.gif", gender: "M" },
    ],
  },
];


export function ContestantPicker({
  onStart,
}: {
  onStart: (contestants: ContestantSetup[], seed: number, options: GameOptions) => void;
}) {
  const [randomCategories, setRandomCategories] = useState({ gh: true, ghvip: true });
  const [showRandomFilters, setShowRandomFilters] = useState(false);
  const [seasonOptions, setSeasonOptions] = useState<GameOptions>({});
  const [reserves, setReserves] = useState<ContestantSetup[]>([]);
  const [selectionMode, setSelectionMode] = useState<"roster" | "reserves">("roster");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContestantSetup[]>([]);

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
    } finally {
      setCustomHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!customHydrated) return;

    try {
      localStorage.setItem(LS_KEY, JSON.stringify(customList));
    } catch {
      // ignore
    }
  }, [customList, customHydrated]);

  const canStart = selected.length >= (seasonOptions.finalStretch ? 14 : 10) && selected.length <= 25 && (!seasonOptions.withdrawals || reserves.length > 0);

  const selectedKeySet = useMemo(() => {
    return new Set(selected.map((c) => `${c.seasonId ?? ""}::${c.name}`));
  }, [selected]);

  const reserveKeySet = new Set(reserves.map(c => `${c.seasonId ?? ""}::${c.name}`));
  const pickingReserves = selectionMode === "reserves";
  const pickedKeys = pickingReserves ? reserveKeySet : selectedKeySet;
  const otherKeys = pickingReserves ? selectedKeySet : reserveKeySet;
  const pickLimitReached = pickingReserves ? reserves.length >= 10 : selected.length >= 25;
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
    return (pickingReserves ? reserves : selected).reduce((acc, c) => acc + (c.seasonId === sid ? 1 : 0), 0);
  }

  function togglePick(setup: ContestantSetup) {
    const key = `${setup.seasonId ?? ""}::${setup.name}`;
    if (otherKeys.has(key)) return;
    const update = pickingReserves ? setReserves : setSelected;
    if (pickedKeys.has(key)) {
      update(prev => prev.filter(c => `${c.seasonId ?? ""}::${c.name}` !== key));
    } else if (!pickLimitReached) {
      update(prev => [...prev, setup]);
    }
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

      setReserves(prev => prev.map(c => c.seasonId === CUSTOM_SEASON_ID && c.name === editingCustomName
        ? { ...c, name: finalName, photoUrl: newEntry.photoUrl, gender: newEntry.gender } : c));
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
    setReserves(prev => prev.filter(c => !(c.seasonId === CUSTOM_SEASON_ID && c.name === name)));
    if (editingCustomName === name) cancelEditCustom();
  }

  function removeSelected(idx: number) {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
  }

  const randomCandidates = SEASONS
    .filter(s => randomCategories[s.id.startsWith("ghvip") ? "ghvip" : "gh"])
    .flatMap(s => s.contestants.map(p => makeSetupFromSeasonPerson(s.id, p)))
    .filter(x => !selectedKeySet.has(`${x.seasonId}::${x.name}`) && !reserveKeySet.has(`${x.seasonId}::${x.name}`));

  function pickRandom(target: "roster" | "reserves" = "roster") {
    if (target === "roster" ? selected.length >= 25 : reserves.length >= 10) return;
    const available = randomCandidates;
    if (!available.length) return;

    const chosen = available[Math.floor(Math.random() * available.length)];
    (target === "reserves" ? setReserves : setSelected)(prev => [...prev, chosen]);
  }

  const normalizeSearch = (value: string) =>
    value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  const query = normalizeSearch(search);
  const matchesName = (name: string) => normalizeSearch(name).includes(query);
  const matchingCustoms = customList.filter(c => matchesName(c.name));
  const matchingSeasons = seasonsWithCustom
    .map(s => ({ ...s, contestants: s.contestants.filter(c => matchesName(c.name)) }))
    .filter(s => !query || (s.id === CUSTOM_SEASON_ID ? matchingCustoms.length > 0 : s.contestants.length > 0));
  const matchCount = matchingSeasons.reduce(
    (count, s) => count + (s.id === CUSTOM_SEASON_ID ? matchingCustoms.length : s.contestants.length), 0
  );
  const renderSeason = (s: SeasonDef) => {
            const seasonSelectedCount = countSelectedForSeason(s.id);
            const total = s.id === CUSTOM_SEASON_ID ? matchingCustoms.length : s.contestants.length;

            return (
              <details
                key={s.id + (query ? "-search" : "-browse")}
                open={!!query || s.id === CUSTOM_SEASON_ID}
                style={{ border: "1px solid var(--picker-border)", borderRadius: 16, padding: 10, background: "var(--picker-card)" }}
              >
                <summary style={{ cursor: "pointer", fontWeight: 900 }}>
                  {s.label} <span style={{ opacity: 0.7, fontWeight: 700 }}>({total} · seleccionados: {seasonSelectedCount})</span>
                </summary>

                <div className="contestantGrid"
                  style={{
                    marginTop: 10,
                    display: "grid",

                    gap: 10,
                  }}
                >
                  {s.id !== CUSTOM_SEASON_ID &&
                    s.contestants.map((p) => {
                      const setup = makeSetupFromSeasonPerson(s.id, p);
                      const key = `${setup.seasonId ?? ""}::${setup.name}`;
                      const picked = pickedKeys.has(key);
                      const blocked = otherKeys.has(key);

                      return (
                        <button
                          key={key}
                          onClick={() => togglePick(setup)}
                          aria-pressed={picked}
                          disabled={blocked || (!picked && pickLimitReached)}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            textAlign: "left",
                            padding: 10,
                            borderRadius: 14,
                            border: "1px solid var(--picker-border)",
                            background: picked ? "var(--picker-selected)" : "var(--picker-card)",
                            color: "var(--picker-text)",
                            cursor: blocked || (!picked && pickLimitReached) ? "not-allowed" : "pointer",
                            opacity: blocked || (!picked && pickLimitReached) ? 0.6 : 1,
                          }}
                          title={blocked ? "Ya está en el otro grupo" : picked ? "Quitar" : pickingReserves ? "Añadir a reservas" : "Añadir al reparto"}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              overflow: "hidden",
                              background: "var(--picker-image)",
                              border: "1px solid var(--picker-border)",
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
                    matchingCustoms.map((c) => {
                      const setup: ContestantSetup = {
                        name: c.name,
                        seasonId: CUSTOM_SEASON_ID,
                        photoUrl: c.photoUrl,
                        gender: normalizeGender(c.gender),
                      };
                      const key = `${setup.seasonId ?? ""}::${setup.name}`;
                      const picked = pickedKeys.has(key);
                      const blocked = otherKeys.has(key);

                      return (
                        <button
                          key={key}
                          onClick={() => togglePick(setup)}
                          aria-pressed={picked}
                          disabled={blocked || (!picked && pickLimitReached)}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            textAlign: "left",
                            padding: 10,
                            borderRadius: 14,
                            border: "1px solid var(--picker-border)",
                            background: picked ? "var(--picker-selected)" : "var(--picker-card)",
                            color: "var(--picker-text)",
                            cursor: blocked || (!picked && pickLimitReached) ? "not-allowed" : "pointer",
                            opacity: blocked || (!picked && pickLimitReached) ? 0.6 : 1,
                          }}
                          title={blocked ? "Ya está en el otro grupo" : picked ? "Quitar" : pickingReserves ? "Añadir a reservas" : "Añadir al reparto"}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              overflow: "hidden",
                              background: "var(--picker-image)",
                              border: "1px solid var(--picker-border)",
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
  };

  return (
    <div className="contestantPicker" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14, maxWidth: 980 }}>
      <h1 style={{ margin: "12px 0", lineHeight: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/SimuladorGHLogo.gif" alt="Simulador Gran Hermano" width={304} height={90}
          style={{ display: "block", width: 304, maxWidth: "100%", height: "auto", margin: "0 auto" }} />
      </h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ opacity: 0.8 }}>
            Seleccionados: <b>{selected.length}</b> (mín {seasonOptions.finalStretch ? 14 : 10} / máx 25)
          </span>

          <button
            onClick={() => pickRandom("roster")}
            disabled={selected.length >= 25 || !randomCandidates.length}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid var(--picker-border)",
              cursor: selected.length >= 25 ? "not-allowed" : "pointer",
              background: "var(--picker-primary)",
              color: "#fff",
              fontWeight: 900,
            }}
          >
            Random
          </button>
          <div style={{ position: "relative" }}>
            <button type="button" className="btn" aria-label="Filtrar selección aleatoria" title="Filtrar selección aleatoria" aria-expanded={showRandomFilters} aria-controls="random-category-filters" onClick={() => setShowRandomFilters(value => !value)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 4h18l-7 8v7l-4 2V12Z" /></svg>
            </button>
            {showRandomFilters && <fieldset id="random-category-filters" onKeyDown={event => { if (event.key === "Escape") setShowRandomFilters(false); }} style={{ position: "absolute", top: "100%", left: 0, zIndex: 10, width: 210, maxWidth: "calc(100vw - 32px)", padding: 14, borderRadius: 12, border: "1px solid var(--picker-border)", background: "var(--random-filter-bg, #151e2d)", color: "var(--picker-text)", margin: 0 }}>
              <legend style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>Categorías aleatorias</legend>
              {(["gh", "ghvip"] as const).map(category => <label key={category} style={{ display: "flex", gap: 8, padding: 6 }}>
                <input type="checkbox" checked={randomCategories[category]} onChange={event => setRandomCategories(previous => ({ ...previous, [category]: event.target.checked }))} />
                {category === "gh" ? "GH" : "GHVIP"}
              </label>)}
              <small>Se aplica a participantes y reservas.</small>
              {!randomCategories.gh && !randomCategories.ghvip && <p role="status">Activa una categoría para usar Random.</p>}
            </fieldset>}
          </div>

          <button
            disabled={!canStart}
            onClick={() => onStart(selected, Date.now(), { ...seasonOptions, reserves })}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid var(--picker-border)",
              cursor: canStart ? "pointer" : "not-allowed",
              background: canStart ? "var(--picker-primary)" : "var(--picker-disabled)",
              color: "#fff",
              fontWeight: 800,
            }}
          >
            Empezar
          </button>
        </div>
      </div>

      <SeasonSettings options={seasonOptions} onChange={setSeasonOptions} reserveCount={reserves.length} participantCount={selected.length}
        onChooseReserves={() => {
          setSelectionMode("reserves");
          document.getElementById("contestant-library")?.scrollIntoView({ behavior: "smooth" });
        }} />
      {seasonOptions.finalStretch && selected.length < 14 && <p role="alert">Recta Final requiere al menos 14 concursantes. Añade {14 - selected.length} más o desactiva esta opción en el engranaje.</p>}
      {seasonOptions.withdrawals && reserves.length === 0 && <p role="status">Añade al menos un reserva para empezar con abandonos activados.</p>}
      <section style={{ border: "1px solid var(--picker-border)", borderRadius: 16, padding: 14 }}>
        <p style={{ fontSize: 13, opacity: 0.8 }}>Para elegir a alguien concreto, ve a Concursantes, selecciona «Elegir reservas» y luego elige a tus elegidos para añadirlos como reservas.</p>
        <div className="row" style={{ marginBottom: 10 }}>
          <strong>Reservas: {reserves.length}/10</strong>
          <button className="btn" onClick={() => pickRandom("reserves")} disabled={reserves.length >= 10 || !randomCandidates.length}>Random reservas</button>
        </div>
        <div className="contestantGrid">
          {reserves.map((c, i) => <button
            key={`${c.seasonId}::${c.name}`}
            title="Quitar de reservas"
            onClick={() => setReserves(prev => prev.filter((_, index) => index !== i))}
            style={{ display: "flex", gap: 8, alignItems: "center", padding: 10, borderRadius: 12, border: "1px solid var(--picker-border)", background: "var(--picker-card)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.photoUrl} alt="" width={44} height={44} style={{ objectFit: "cover", borderRadius: 10 }} />
            <span>{c.name}</span>
          </button>)}
        </div>
      </section>
      <div>
        <label htmlFor="contestant-search" style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
          Buscar concursantes en todas las ediciones
        </label>
        <input
          id="contestant-search"
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Escribe un nombre…"
          className="contestantSearch"
        />
        {query && (
          <p role="status" style={{ fontSize: 13 }}>
            {matchCount === 0 ? "No hay concursantes con ese nombre." : `${matchCount} concursantes encontrados`}
          </p>
        )}
      </div>

      <section style={{ border: "1px solid var(--picker-border)", borderRadius: 16, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <strong style={{ fontSize: 16 }}>Participantes</strong>
          <span style={{ opacity: 0.7, fontSize: 13 }}>(clic en una tarjeta para quitar)</span>
        </div>

        {selected.length === 0 ? (
          <div style={{ opacity: 0.75 }}>Aún no has seleccionado concursantes.</div>
        ) : (
          <div className="contestantGrid">
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
                  border: "1px solid var(--picker-border)",
                  background: "var(--picker-card)",
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
                    background: "var(--picker-image)",
                    border: "1px solid var(--picker-border)",
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

      <section id="contestant-library" style={{ border: "1px solid var(--picker-border)", borderRadius: 16, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <strong style={{ fontSize: 16 }}>Concursantes</strong>
          <button className="btn" aria-pressed={!pickingReserves} onClick={() => setSelectionMode("roster")}>Elegir participantes</button>
          <button className="btn" aria-pressed={pickingReserves} onClick={() => setSelectionMode("reserves")}>Elegir reservas</button>
          <b>{pickingReserves ? "Añadiendo a reservas (máx. 10)" : "Añadiendo al reparto (máx. 25)"}</b>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {(["gh", "ghvip"] as const).map(category => {
            const seasons = matchingSeasons.filter(s => s.id !== CUSTOM_SEASON_ID && (s.id.startsWith("ghvip") ? "ghvip" : "gh") === category);
            if (!seasons.length) return null;
            return <details key={category + (query ? "-search" : "-browse")} open={!!query} style={{ border: "1px solid var(--picker-border)", borderRadius: 14, padding: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 900 }}>{category === "gh" ? "Gran Hermano" : "Gran Hermano VIP"}</summary>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{seasons.map(renderSeason)}</div>
            </details>;
          })}
          {matchingSeasons.filter(s => s.id === CUSTOM_SEASON_ID).map(renderSeason)}

        </div>
      </section>

      <section style={{ border: "1px solid var(--picker-border)", borderRadius: 16, padding: 14 }}>
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
                style={{ padding: 10, borderRadius: 12, border: "1px solid var(--picker-border)", width: 260 }}
              />
              <input
                value={customPhotoUrl}
                onChange={(e) => setCustomPhotoUrl(e.target.value)}
                placeholder="Link de foto (png/gif/jpg)"
                style={{ padding: 10, borderRadius: 12, border: "1px solid var(--picker-border)", width: 420 }}
              />
              <select
                value={customGender}
                onChange={(e) => setCustomGender(e.target.value as Gender)}
                style={{ padding: 10, borderRadius: 12, border: "1px solid var(--picker-border)" }}
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
                  border: "1px solid var(--picker-border)",
                  cursor: !customName.trim() || !customPhotoUrl.trim() ? "not-allowed" : "pointer",
                  background: "var(--picker-card)",
                  fontWeight: 800,
                }}
              >
                {editingCustomName ? "Actualizar concursante" : "Crear concursante"}
              </button>

              {editingCustomName && (
                <button
                  onClick={cancelEditCustom}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--picker-border)",
                    cursor: "pointer",
                    background: "var(--picker-card)",
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

            <div style={{ marginTop: 6, borderTop: "1px solid var(--picker-border)", paddingTop: 10 }}>
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
                        justifyContent: "space-between", flexWrap: "wrap",
                        gap: 10,
                        padding: 10,
                        border: "1px solid var(--picker-border)",
                        borderRadius: 14,
                        background: "var(--picker-card)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            overflow: "hidden",
                            background: "var(--picker-image)",
                            border: "1px solid var(--picker-border)",
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
                            border: "1px solid var(--picker-border)",
                            background: "var(--picker-card)",
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
                            border: "1px solid var(--picker-border)",
                            background: "var(--picker-card)",
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
