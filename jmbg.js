/**
 * jmbg.js: provjera jedinstvenog matičnog broja građana (JMBG)
 *
 * JMBG ima 13 cifara raspoređenih ovako:
 *
 *   D D M M L L L R R B B B K
 *   0 1 2 3 4 5 6 7 8 9 ...  12
 *
 *   DD   dan rođenja
 *   MM   mjesec rođenja
 *   LLL  posljednje tri cifre godine rođenja
 *   RR   oznaka regije upisa
 *   BBB  redni broj u toj regiji i datumu, ujedno nosi podatak o polu
 *   K    kontrolna cifra
 *
 * Glavna funkcija je provjeriJMBG(). Ona ne vraća samo tačno ili netačno,
 * nego i razlog odbijanja, pa se poruka može prikazati korisniku.
 */

/*
   TABELA REGIJA
   */

// Regije unutar Bosne i Hercegovine imaju svaka svoju oznaku.
const REGIJE_BIH = {
  10: "Banja Luka",
  11: "Bihać",
  12: "Doboj",
  13: "Goražde",
  14: "Livno",
  15: "Mostar",
  16: "Prijedor",
  17: "Sarajevo",
  18: "Tuzla",
  19: "Zenica",
};

// Ostale republike bivše Jugoslavije dobile su opsege oznaka.
const OPSEZI_REGIJA = [
  { od: 0, do: 0, naziv: "Stranci s privremenim boravkom" },
  { od: 1, do: 9, naziv: "Stranci" },
  { od: 20, do: 29, naziv: "Crna Gora" },
  { od: 30, do: 39, naziv: "Hrvatska" },
  { od: 40, do: 49, naziv: "Sjeverna Makedonija" },
  { od: 50, do: 59, naziv: "Slovenija" },
  { od: 60, do: 69, naziv: "Nedodijeljena oznaka" },
  { od: 70, do: 79, naziv: "Uža Srbija" },
  { od: 80, do: 89, naziv: "Vojvodina" },
  { od: 90, do: 99, naziv: "Kosovo" },
];

// Opseg 60–69 nikada nije dodijeljen nijednoj regiji.
const NEDODIJELJENI_OPSEG = { od: 60, do: 69 };

/* 
   POMOĆNE FUNKCIJE
 */

/**
 * Je li godina prestupna?
 * Prestupna je svaka djeljiva sa 4, osim onih djeljivih sa 100
 * koje nisu djeljive sa 400. Zato 2000. jeste, a 1900. nije.
 */
function jePrestupna(godina) {
  return (godina % 4 === 0 && godina % 100 !== 0) || godina % 400 === 0;
}

/**
 * Koliko dana ima taj mjesec u toj godini.
 */
function danaUMjesecu(mjesec, godina) {
  const dani = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (mjesec === 2 && jePrestupna(godina)) {
    return 29;
  }

  return dani[mjesec - 1];
}

/**
 * Iz tri cifre u JMBG-u rekonstruiše punu godinu.
 *
 * U broju stoje samo posljednje tri cifre, pa se stoljeće mora
 * pogoditi. Dogovor je: 800 i više pripada 1800–1999, a sve ispod
 * toga pripada 2000. i naviše. Tako 995 daje 1995, a 005 daje 2005.
 */
function punaGodina(triCifre) {
  return triCifre >= 800 ? 1000 + triCifre : 2000 + triCifre;
}

/**
 * Traži naziv regije po oznaci. Vraća null ako oznaka nije dodijeljena.
 */
function nazivRegije(oznaka) {
  if (REGIJE_BIH[oznaka] !== undefined) {
    return REGIJE_BIH[oznaka] + ", Bosna i Hercegovina";
  }

  for (const opseg of OPSEZI_REGIJA) {
    if (oznaka >= opseg.od && oznaka <= opseg.do) {
      return opseg.naziv;
    }
  }

  return null;
}

/* 
   KONTROLNA CIFRA
   */

/**
 * Računa kontrolnu cifru iz prvih dvanaest cifara.
 *
 * Cifre se sabiraju u parovima (prva sa sedmom, druga sa osmom i tako
 * dalje), a svaki par se množi težinom od 7 nadolje do 2:
 *
 *   S = 7(c1+c7) + 6(c2+c8) + 5(c3+c9) + 4(c4+c10) + 3(c5+c11) + 2(c6+c12)
 *   m = 11 − (S mod 11)
 *
 * Ako je m između 1 i 9, kontrolna cifra je m.
 * Ako je m jednako 10 ili 11, kontrolna cifra je 0.
 *
 * @param {number[]} cifre niz od najmanje 12 cifara
 * @returns {number} kontrolna cifra, 0–9
 */
function izracunajKontrolnuCifru(cifre) {
  let zbir = 0;
  let tezina = 7;

  // i ide od 0 do 5, a par mu je i + 6
  for (let i = 0; i < 6; i++) {
    zbir += tezina * (cifre[i] + cifre[i + 6]);
    tezina--;
  }

  const m = 11 - (zbir % 11);

  if (m >= 1 && m <= 9) {
    return m;
  }

  // m je 10 ili 11
  return 0;
}

/*
   GLAVNA PROVJERA
   */

/**
 * Provjerava JMBG i objašnjava zašto je odbijen.
 *
 * @param {string} unos  JMBG kao tekst, 13 cifara
 * @param {object} [opcije]
 * @param {Date}   [opcije.danas]  referentni datum za provjeru budućnosti
 * @param {boolean}[opcije.dozvoliNedodijeljenuRegiju=false]
 *
 * @returns {object} Kad je ispravan:
 *   { ispravan: true, podaci: { ... } }
 * Kad nije:
 *   { ispravan: false, kod: "DUZINA", razlog: "..." }
 */
function provjeriJMBG(unos, opcije = {}) {
  const danas = opcije.danas || new Date();
  const dozvoliNedodijeljenu = opcije.dozvoliNedodijeljenuRegiju === true;

  //  tip podatka
  if (typeof unos !== "string") {
    return odbij("NIJE_TEKST", "JMBG se šalje kao tekst, ne kao broj.");
  }

  const jmbg = unos.trim();

  //  dužina
  if (jmbg.length !== 13) {
    return odbij(
      "DUZINA",
      "JMBG mora imati tačno 13 cifara, a ovaj ih ima " + jmbg.length + ".",
    );
  }

  //  samo cifre
  if (/^[0-9]{13}$/.test(jmbg) === false) {
    return odbij("NIJE_BROJ", "JMBG smije sadržavati samo cifre.");
  }

  const cifre = jmbg.split("").map(Number);

  //  razlaganje na dijelove
  const dan = Number(jmbg.slice(0, 2));
  const mjesec = Number(jmbg.slice(2, 4));
  const triCifreGodine = Number(jmbg.slice(4, 7));
  const regija = Number(jmbg.slice(7, 9));
  const redniBroj = Number(jmbg.slice(9, 12));
  const kontrolna = cifre[12];

  const godina = punaGodina(triCifreGodine);

  // mjesec
  if (mjesec < 1 || mjesec > 12) {
    return odbij(
      "MJESEC_RASPON",
      "Mjesec mora biti između 01 i 12, a upisano je " + jmbg.slice(2, 4) + ".",
    );
  }

  //  dan
  if (dan < 1) {
    return odbij("DAN_RASPON", "Dan mora biti najmanje 01.");
  }

  const najviseDana = danaUMjesecu(mjesec, godina);

  if (dan > najviseDana) {
    // Poseban slučaj: 29. februar u neprestupnoj godini
    if (mjesec === 2 && dan === 29) {
      return odbij(
        "DATUM_NE_POSTOJI",
        godina + ". nije prestupna godina, pa 29. februar ne postoji.",
      );
    }

    return odbij(
      "DATUM_NE_POSTOJI",
      "Mjesec " +
        mjesec +
        ". u " +
        godina +
        ". ima " +
        najviseDana +
        " dana, pa datum " +
        dan +
        "." +
        mjesec +
        "." +
        godina +
        ". ne postoji.",
    );
  }

  //  datum u budućnosti
  const datumRodjenja = new Date(godina, mjesec - 1, dan);

  if (datumRodjenja > danas) {
    return odbij(
      "DATUM_U_BUDUCNOSTI",
      "Datum rođenja " + formatirajDatum(datumRodjenja) + " je u budućnosti.",
    );
  }

  //  regija
  if (
    dozvoliNedodijeljenu === false &&
    regija >= NEDODIJELJENI_OPSEG.od &&
    regija <= NEDODIJELJENI_OPSEG.do
  ) {
    return odbij(
      "REGIJA_NEDODIJELJENA",
      "Oznake regije od 60 do 69 nisu nikada dodijeljene, a upisano je " +
        jmbg.slice(7, 9) +
        ".",
    );
  }

  const imeRegije = nazivRegije(regija);

  if (imeRegije === null) {
    return odbij(
      "REGIJA_NEPOZNATA",
      "Oznaka regije " + jmbg.slice(7, 9) + " ne odgovara nijednoj regiji.",
    );
  }

  //  kontrolna cifra
  const ocekivana = izracunajKontrolnuCifru(cifre);

  if (kontrolna !== ocekivana) {
    return odbij(
      "KONTROLNA_CIFRA",
      "Kontrolna cifra ne odgovara ostatku broja. Očekivano " +
        ocekivana +
        ", a upisano " +
        kontrolna +
        ".",
    );
  }

  //  sve prošlo
  return {
    ispravan: true,
    podaci: {
      datumRodjenja: datumRodjenja,
      datumTekst: formatirajDatum(datumRodjenja),
      godine: izracunajGodine(datumRodjenja, danas),
      regija: imeRegije,
      oznakaRegije: regija,
      pol: redniBroj < 500 ? "muški" : "ženski",
      redniBroj: redniBroj,
      kontrolnaCifra: kontrolna,
    },
  };
}

/* 
   SITNICE
   */

function odbij(kod, razlog) {
  return { ispravan: false, kod: kod, razlog: razlog };
}

function formatirajDatum(datum) {
  return (
    datum.getDate() +
    "." +
    (datum.getMonth() + 1) +
    "." +
    datum.getFullYear() +
    "."
  );
}

function izracunajGodine(rodjen, danas) {
  let godine = danas.getFullYear() - rodjen.getFullYear();

  const prijeRodjendana =
    danas.getMonth() < rodjen.getMonth() ||
    (danas.getMonth() === rodjen.getMonth() &&
      danas.getDate() < rodjen.getDate());

  if (prijeRodjendana) {
    godine--;
  }

  return godine;
}

/**
 * Dopunjava prvih 12 cifara ispravnom kontrolnom cifrom.
 * Korisno za testove i za generisanje primjera.
 *
 * @param {string} prvih12
 * @returns {string} puni JMBG od 13 cifara
 */
function dopuniKontrolnu(prvih12) {
  if (/^[0-9]{12}$/.test(prvih12) === false) {
    throw new Error("Očekujem tačno 12 cifara.");
  }

  const cifre = prvih12.split("").map(Number);
  return prvih12 + izracunajKontrolnuCifru(cifre);
}

/* 
   IZVOZ

   Radi i u Node-u (require) i u browseru (window.JMBG).
    */

const bibliotekaJMBG = {
  provjeriJMBG,
  izracunajKontrolnuCifru,
  dopuniKontrolnu,
  jePrestupna,
  danaUMjesecu,
  punaGodina,
  nazivRegije,
  REGIJE_BIH,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = bibliotekaJMBG;
}

if (typeof window !== "undefined") {
  window.JMBG = bibliotekaJMBG;
}

/*

   node jmbg.js 0101990170006
  */

if (typeof require !== "undefined" && require.main === module) {
  const argument = process.argv[2];

  if (!argument) {
    console.log("Upotreba: node jmbg.js <jmbg>");
    process.exit(0);
  }

  const rezultat = provjeriJMBG(argument);

  if (rezultat.ispravan) {
    const p = rezultat.podaci;
    console.log("Ispravan JMBG.");
    console.log(
      "  Datum rođenja: " + p.datumTekst + "  (" + p.godine + " godina)",
    );
    console.log("  Regija:        " + p.regija);
    console.log("  Pol:           " + p.pol);
  } else {
    console.log("Neispravan JMBG.");
    console.log("  Kod:    " + rezultat.kod);
    console.log("  Razlog: " + rezultat.razlog);
    process.exitCode = 1;
  }
}
