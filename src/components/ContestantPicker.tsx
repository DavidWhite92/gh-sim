"use client";

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
      { name: "Sonia A.", file: "Sonia Arenas.gif", gender: "F" },
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
      { name: "Toño", file: "Tono.gif", gender: "M" },
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
      { name: "Almudena", file: "Almudena.gif", gender: "F" },
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
      { name: "Juan", file: "Juangh11.gif", gender: "M" },
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
  {
    id: "gh14",
    label: "GH Catorce",
    contestants: [
      { name: "Susana", file: "SusanaMolina.gif", gender: "F" },
      { name: "Igor", file: "Igor.gif", gender: "M" },
      { name: "Desirée", file: "Desiréegh14.gif", gender: "F" },
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
      { name: "Adrián", file: "Adriangh14.gif", gender: "M" },
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
      { name: "Yolanda", file: "Yolandagh15.gif", gender: "F" },
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
];


export function ContestantPicker({
  onStart,
}: {
  onStart: (contestants: ContestantSetup[], seed: number, options: GameOptions) => void;
}) {
  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState(false);
  const [reserves, setReserves] = useState<ContestantSetup[]>([]);
  const [selectionMode, setSelectionMode] = useState<"roster" | "reserves">("roster");
  const [repechageEnabled, setRepechageEnabled] = useState(false);
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

  const canStart = selected.length >= 10 && selected.length <= 25 && (!withdrawalsEnabled || reserves.length > 0);

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

  function pickRandom(target: "roster" | "reserves" = "roster") {
    if (target === "roster" ? selected.length >= 25 : reserves.length >= 10) return;

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

    const available = pool.filter((x) => !selectedKeySet.has(`${x.seasonId ?? ""}::${x.name}`) && !reserveKeySet.has(`${x.seasonId ?? ""}::${x.name}`));
    if (available.length === 0) return;

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
  return (
    <div className="contestantPicker" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14, maxWidth: 980 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>Simulador Gran Hermano</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ opacity: 0.8 }}>
            Seleccionados: <b>{selected.length}</b> (mín 10 / máx 25)
          </span>

          <button
            onClick={() => pickRandom("roster")}
            disabled={selected.length >= 25}
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

          <button
            disabled={!canStart}
            onClick={() => onStart(selected, Date.now(), { repechage: repechageEnabled, withdrawals: withdrawalsEnabled, reserves })}
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

      <label style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input
          type="checkbox"
          checked={repechageEnabled}
          onChange={event => setRepechageEnabled(event.target.checked)}
        />
        <strong>Activar repesca</strong>
        <span style={{ fontSize: 13, opacity: 0.8 }}>
          Un expulsado volverá por votación del público.
          {selected.length >= 10 && ` Entre la 3.ª y la ${Math.min(8, selected.length - 6)}.ª expulsión.`}
        </span>
      </label>
      <section style={{ border: "1px solid var(--picker-border)", borderRadius: 16, padding: 14 }}>
        <label className="row">
          <input type="checkbox" checked={withdrawalsEnabled} onChange={e => setWithdrawalsEnabled(e.target.checked)} />
          <strong>Activar abandonos</strong>
        </label>
        <p style={{ fontSize: 13, opacity: 0.8 }}>Muy poco frecuentes, hasta 3 por temporada. Cada abandono incorpora un reserva al azar. Elige al menos uno para activar esta opción.</p>
        <div className="row" style={{ marginBottom: 10 }}>
          <strong>Reservas: {reserves.length}/10</strong>
          <button className="btn" onClick={() => pickRandom("reserves")} disabled={reserves.length >= 10}>Random reservas</button>
          <button className="btn" onClick={() => setSelectionMode("reserves")}>Elegir reservas</button>
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
          <strong style={{ fontSize: 16 }}>Roster</strong>
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

      <section style={{ border: "1px solid var(--picker-border)", borderRadius: 16, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <strong style={{ fontSize: 16 }}>Concursantes</strong>
          <button className="btn" aria-pressed={!pickingReserves} onClick={() => setSelectionMode("roster")}>Elegir participantes</button>
          <button className="btn" aria-pressed={pickingReserves} onClick={() => setSelectionMode("reserves")}>Elegir reservas</button>
          <b>{pickingReserves ? "Añadiendo a reservas (máx. 10)" : "Añadiendo al reparto (máx. 25)"}</b>
          <span style={{ opacity: 0.7, fontSize: 13 }}>(abre/cierra y clic para añadir/quitar)</span>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {matchingSeasons.map((s, idx) => {
            const seasonSelectedCount = countSelectedForSeason(s.id);
            const total = s.id === CUSTOM_SEASON_ID ? matchingCustoms.length : s.contestants.length;

            return (
              <details
                key={s.id + (query ? "-search" : "-browse")}
                open={!!query || idx === 0 || s.id === CUSTOM_SEASON_ID}
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
          })}
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
