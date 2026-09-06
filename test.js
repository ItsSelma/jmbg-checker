/**
 * test.js — testovi za jmbg.js
 *
 * Bez frameworka. Mali runner ispod broji koliko je testova prošlo,
 * a na kraju izlazi s kodom 1 ako je ijedan pao, pa se može koristiti
 * u automatskoj provjeri.
 *
 * Pokretanje:  node test.js
 */

const {
  provjeriJMBG,
  izracunajKontrolnuCifru,
  dopuniKontrolnu,
  jePrestupna,
  danaUMjesecu,
  punaGodina,
} = require("./jmbg.js");


/* =====================================================
   MALI RUNNER
   ===================================================== */

let proslo = 0;
let palo = 0;
const pali = [];

function test(opis, funkcija) {
  try {
    funkcija();
    proslo++;
    console.log("  \u2713 " + opis);
  } catch (greska) {
    palo++;
    pali.push({ opis, poruka: greska.message });
    console.log("  \u2717 " + opis);
    console.log("      " + greska.message);
  }
}

function grupa(naziv) {
  console.log("\n" + naziv);
}

function jednako(dobijeno, ocekivano, sta) {
  if (dobijeno !== ocekivano) {
    throw new Error(
      (sta || "vrijednost") + ": očekivano " + JSON.stringify(ocekivano) +
      ", dobijeno " + JSON.stringify(dobijeno)
    );
  }
}

function ispravan(jmbg) {
  const r = provjeriJMBG(jmbg, { danas: DANAS });
  if (r.ispravan !== true) {
    throw new Error(jmbg + " je odbijen: " + r.kod + " — " + r.razlog);
  }
  return r;
}

function odbijen(jmbg, ocekivaniKod) {
  const r = provjeriJMBG(jmbg, { danas: DANAS });
  if (r.ispravan !== false) {
    throw new Error(jmbg + " je prihvaćen, a nije trebao biti.");
  }
  jednako(r.kod, ocekivaniKod, "kod odbijanja");
  if (!r.razlog || r.razlog.length < 5) {
    throw new Error("Odbijanje nema upotrebljiv razlog.");
  }
  return r;
}


// Fiksni "današnji" datum, da testovi ne padnu za godinu dana.
const DANAS = new Date(2026, 0, 15);


/* =====================================================
   1. ISPRAVNI BROJEVI
   ===================================================== */

grupa("Ispravni brojevi");

test("prihvata ispravan JMBG iz Sarajeva", function () {
  const r = ispravan("0101990170062");
  jednako(r.podaci.datumTekst, "1.1.1990.", "datum");
  jednako(r.podaci.oznakaRegije, 17, "oznaka regije");
});

test("prepoznaje regiju po oznaci", function () {
  const r = ispravan("1505975150001");
  jednako(r.podaci.regija, "Mostar, Bosna i Hercegovina", "regija");
});

test("prepoznaje ženski pol po rednom broju 500 i više", function () {
  const r = ispravan("0304005105004");
  jednako(r.podaci.pol, "ženski", "pol");
});

test("prepoznaje muški pol po rednom broju ispod 500", function () {
  const r = ispravan("3112999190000");
  jednako(r.podaci.pol, "muški", "pol");
});


/* =====================================================
   2. DUŽINA I SADRŽAJ
   ===================================================== */

grupa("Dužina i sadržaj");

test("odbija broj sa 12 cifara", function () {
  const r = odbijen("010199017006", "DUZINA");
  if (r.razlog.includes("12") === false) {
    throw new Error("Razlog ne kaže koliko cifara je zapravo uneseno.");
  }
});

test("odbija broj sa 14 cifara", function () {
  odbijen("01019901700622", "DUZINA");
});

test("odbija prazan unos", function () {
  odbijen("", "DUZINA");
});

test("odbija unos sa slovima", function () {
  odbijen("010199017O062", "NIJE_BROJ");
});

test("odbija unos koji nije tekst", function () {
  const r = provjeriJMBG(101990170062);
  jednako(r.ispravan, false, "ispravan");
  jednako(r.kod, "NIJE_TEKST", "kod");
});

test("zanemaruje razmake na krajevima", function () {
  ispravan("  0101990170062  ");
});


/* =====================================================
   3. DATUM
   ===================================================== */

grupa("Datum rođenja");

test("prihvata 29. februar u prestupnoj 1988.", function () {
  const r = ispravan("2902988170004");
  jednako(r.podaci.datumTekst, "29.2.1988.", "datum");
});

test("prihvata 29. februar 2000. jer je djeljiva sa 400", function () {
  ispravan("2902000170004");
});

test("odbija 29. februar u neprestupnoj 1900.", function () {
  const r = odbijen("2902900170000", "DATUM_NE_POSTOJI");
  if (r.razlog.includes("1900") === false) {
    throw new Error("Razlog ne spominje godinu.");
  }
});

test("odbija 29. februar u neprestupnoj 1995.", function () {
  odbijen(dopuniKontrolnu("290299517000"), "DATUM_NE_POSTOJI");
});

test("odbija 31. april, mjesec koji ima 30 dana", function () {
  odbijen(dopuniKontrolnu("310499017000"), "DATUM_NE_POSTOJI");
});

test("odbija 32. dan u mjesecu", function () {
  odbijen(dopuniKontrolnu("320199017000"), "DATUM_NE_POSTOJI");
});

test("odbija dan 00", function () {
  odbijen(dopuniKontrolnu("000199017000"), "DAN_RASPON");
});

test("odbija mjesec 13", function () {
  odbijen(dopuniKontrolnu("011399017000"), "MJESEC_RASPON");
});

test("odbija mjesec 00", function () {
  odbijen(dopuniKontrolnu("010099017000"), "MJESEC_RASPON");
});

test("odbija datum rođenja u budućnosti", function () {
  // 1.1.2030. u odnosu na fiksni DANAS = 15.1.2026.
  odbijen(dopuniKontrolnu("010103017000"), "DATUM_U_BUDUCNOSTI");
});


/* =====================================================
   4. REGIJA
   ===================================================== */

grupa("Oznaka regije");

test("odbija nedodijeljeni opseg 60 do 69", function () {
  odbijen(dopuniKontrolnu("010199065000"), "REGIJA_NEDODIJELJENA");
});

test("prihvata opseg 60 do 69 ako se to izričito dozvoli", function () {
  const jmbg = dopuniKontrolnu("010199065000");
  const r = provjeriJMBG(jmbg, {
    danas: DANAS,
    dozvoliNedodijeljenuRegiju: true,
  });
  jednako(r.ispravan, true, "ispravan uz dozvolu");
});

test("prepoznaje regiju izvan Bosne i Hercegovine", function () {
  const r = ispravan(dopuniKontrolnu("010199035000"));
  jednako(r.podaci.regija, "Hrvatska", "regija");
});


/* =====================================================
   5. KONTROLNA CIFRA
   ===================================================== */

grupa("Kontrolna cifra");

test("odbija pogrešnu kontrolnu cifru", function () {
  // Ispravan je 0101990170062, mijenjamo zadnju cifru u 5
  const r = odbijen("0101990170065", "KONTROLNA_CIFRA");
  if (r.razlog.includes("2") === false) {
    throw new Error("Razlog ne kaže koja se cifra očekivala.");
  }
});

test("odbija sve nule, jer kontrolna cifra ne odgovara", function () {
  // 0000000000000 ionako pada ranije na danu, provjeravamo drugi slučaj
  const r = provjeriJMBG("1111111111111", { danas: DANAS });
  jednako(r.ispravan, false, "ispravan");
});

test("izracunajKontrolnuCifru vraća 0 kad je ostatak 0", function () {
  // Slučaj gdje je m jednako 11, pa kontrolna cifra mora biti 0
  const jmbg = "3112999190000";
  jednako(jmbg[12], "0", "kontrolna cifra u primjeru");
  const cifre = jmbg.split("").map(Number);
  jednako(izracunajKontrolnuCifru(cifre), 0, "izračunata cifra");
});

test("dopuniKontrolnu proizvodi broj koji prolazi provjeru", function () {
  const puni = dopuniKontrolnu("150597515000");
  jednako(puni.length, 13, "dužina");
  ispravan(puni);
});

test("dopuniKontrolnu odbija pogrešan broj cifara", function () {
  let bacilo = false;
  try {
    dopuniKontrolnu("12345");
  } catch (e) {
    bacilo = true;
  }
  jednako(bacilo, true, "baca grešku");
});


/* =====================================================
   6. POMOĆNE FUNKCIJE
   ===================================================== */

grupa("Pomoćne funkcije");

test("jePrestupna: 2000 da, 1900 ne, 2024 da, 2023 ne", function () {
  jednako(jePrestupna(2000), true, "2000");
  jednako(jePrestupna(1900), false, "1900");
  jednako(jePrestupna(2024), true, "2024");
  jednako(jePrestupna(2023), false, "2023");
});

test("danaUMjesecu: februar 28 ili 29, april 30, januar 31", function () {
  jednako(danaUMjesecu(2, 1995), 28, "februar 1995");
  jednako(danaUMjesecu(2, 1988), 29, "februar 1988");
  jednako(danaUMjesecu(4, 2000), 30, "april");
  jednako(danaUMjesecu(1, 2000), 31, "januar");
});

test("punaGodina: 990 daje 1990, a 005 daje 2005", function () {
  jednako(punaGodina(990), 1990, "990");
  jednako(punaGodina(5), 2005, "005");
  jednako(punaGodina(800), 1800, "800 je granica");
  jednako(punaGodina(799), 2799, "799 pada u drugo stoljeće");
});


/* =====================================================
   REZULTAT
   ===================================================== */

console.log("\n" + "-".repeat(52));
console.log("Prošlo: " + proslo + "    Palo: " + palo +
            "    Ukupno: " + (proslo + palo));

if (palo > 0) {
  console.log("\nPali testovi:");
  pali.forEach(function (t) {
    console.log("  - " + t.opis + "\n    " + t.poruka);
  });
  process.exit(1);
}

console.log("Svi testovi prolaze.");
