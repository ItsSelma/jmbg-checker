# Provjera JMBG-a

Mala biblioteka koja provjerava jedinstveni matični broj građana i,
kad ga odbije, kaže i zašto. Bez zavisnosti i bez frameworka.

```
jmbg.js    logika
test.js    testovi
```

---

## Pokretanje

Treba ti Node.js. Provjeri da ga imaš:

```
node --version
```

Kloniraj repo i pokreni testove:

```
git clone https://github.com/ItsSelma/jmbg-checker.git
cd jmbg-provjera
node test.js
```

Ako sve radi, na kraju ispisa piše `Svi testovi prolaze.` Kad neki test
padne, izlazni kod je 1, pa se ovo može staviti i u automatsku provjeru.

Možeš provjeriti i pojedinačan broj iz terminala:

```
node jmbg.js 0101990170062
```

---

## Primjer poziva

```js
const { provjeriJMBG } = require("./jmbg.js");

const rezultat = provjeriJMBG("0101990170062");

if (rezultat.ispravan) {
  console.log(rezultat.podaci.datumTekst); // 1.1.1990.
  console.log(rezultat.podaci.regija); // Sarajevo, Bosna i Hercegovina
  console.log(rezultat.podaci.pol); // muški
} else {
  console.log(rezultat.razlog);
}
```

Kad broj nije ispravan:

```js
provjeriJMBG("2902900170000");
// {
//   ispravan: false,
//   kod: "DATUM_NE_POSTOJI",
//   razlog: "1900. nije prestupna godina, pa 29. februar ne postoji."
// }
```

Odgovor uvijek ima i `kod` i `razlog`. Kod je za program -> po njemu se
grana logika i ne mijenja se. Razlog je rečenica koja se može pokazati
korisniku.

### Kodovi odbijanja

| Kod                    | Kada se javlja                                           |
| ---------------------- | -------------------------------------------------------- |
| `NIJE_TEKST`           | Poslan je broj umjesto teksta, pa bi vodeća nula nestala |
| `DUZINA`               | Nema tačno 13 cifara                                     |
| `NIJE_BROJ`            | Ima slova ili znakova                                    |
| `DAN_RASPON`           | Dan je 00                                                |
| `MJESEC_RASPON`        | Mjesec nije između 01 i 12                               |
| `DATUM_NE_POSTOJI`     | 31. april, 29. februar u neprestupnoj godini i slično    |
| `DATUM_U_BUDUCNOSTI`   | Osoba još nije rođena                                    |
| `REGIJA_NEDODIJELJENA` | Oznaka je iz opsega 60–69                                |
| `REGIJA_NEPOZNATA`     | Oznaka ne pripada nijednom poznatom opsegu               |
| `KONTROLNA_CIFRA`      | Zadnja cifra ne odgovara ostatku broja                   |

---

## Kako je JMBG složen

Trinaest cifara, u pet dijelova:

```
0 1 0 1 9 9 0 1 7 0 0 6 2
└─┘ └─┘ └───┘ └─┘ └───┘ │
 DD  MM  LLL   RR  BBB   K
```

| Dio   | Šta znači                                         |
| ----- | ------------------------------------------------- |
| `DD`  | dan rođenja                                       |
| `MM`  | mjesec rođenja                                    |
| `LLL` | posljednje tri cifre godine                       |
| `RR`  | oznaka regije upisa                               |
| `BBB` | redni broj; ispod 500 je muški, 500 i više ženski |
| `K`   | kontrolna cifra                                   |

Pošto se za godinu čuvaju samo tri cifre, stoljeće se mora pogoditi.
Dogovor je da 800 i više pripada 1800–1999, a sve ispod toga 2000. i
naviše. Tako `990` daje 1990, a `005` daje 2005.

Oznake regije 10–19 pripadaju Bosni i Hercegovini, po gradovima:
10 Banja Luka, 11 Bihać, 12 Doboj, 13 Goražde, 14 Livno, 15 Mostar,
16 Prijedor, 17 Sarajevo, 18 Tuzla, 19 Zenica. Ostale republike bivše
Jugoslavije imaju svoje opsege, a 60–69 nikada nije dodijeljen.

---

## Kontrolna cifra

Zadnja cifra nije proizvoljna. Ona se računa iz prethodnih dvanaest i
služi da se uhvati greška u kucanju, ako neko zamijeni dvije cifre ili
pogriješi jednu, kontrolna cifra više neće odgovarati.

Cifre se sabiraju u parovima: prva sa sedmom, druga sa osmom, i tako
dalje. Svaki par se pomnoži svojom težinom, koja ide od 7 nadolje do 2:

```
S = 7·(c1+c7) + 6·(c2+c8) + 5·(c3+c9) + 4·(c4+c10) + 3·(c5+c11) + 2·(c6+c12)

m = 11 − (S mod 11)
```

Zatim:

- ako je `m` između 1 i 9, kontrolna cifra je `m`
- ako je `m` jednako 10 ili 11, kontrolna cifra je 0

### Primjer: 0101990170062

Prvih dvanaest cifara su `0 1 0 1 9 9 0 1 7 0 0 6`.

| Par      | Cifre | Zbir | Težina | Doprinos |
| -------- | ----- | ---- | ------ | -------- |
| c1 + c7  | 0 + 0 | 0    | 7      | 0        |
| c2 + c8  | 1 + 1 | 2    | 6      | 12       |
| c3 + c9  | 0 + 7 | 7    | 5      | 35       |
| c4 + c10 | 1 + 0 | 1    | 4      | 4        |
| c5 + c11 | 9 + 0 | 9    | 3      | 27       |
| c6 + c12 | 9 + 6 | 15   | 2      | 30       |

```
S = 0 + 12 + 35 + 4 + 27 + 30 = 108
108 mod 11 = 9
m = 11 − 9 = 2
```

`m` je 2, što je između 1 i 9, pa je kontrolna cifra **2**. Broj se
završava sa 2, dakle prolazi.

### Zašto 10 i 11 daju nulu

`S mod 11` daje broj od 0 do 10, pa `m` može biti od 1 do 11. Vrijednosti
10 i 11 ne stanu u jednu cifru, pa se obje preslikavaju u 0.

To znači da nula kao kontrolna cifra pokriva dva različita slučaja, i tu
formula gubi malo snage, dio grešaka koje bi inače uhvatila prođe. Neki
izvori zato tvrde da broj sa `m = 10` uopšte nije trebao biti dodijeljen.
Ovdje sam se držala raširenije varijante po kojoj su i 10 i 11 dozvoljeni
i daju nulu, jer je tako u brojevima koji su stvarno u opticaju.

---

## Testovi

31 test u šest grupa. Pokrivaju sve što zadatak traži i još ponešto:

- ispravni brojevi i čitanje datuma, regije i pola
- prekratak i predugačak broj, prazan unos, slova u unosu, broj umjesto teksta
- **29. februar** u prestupnoj 1988. i 2000. -> prolazi
- **29. februar** u neprestupnoj 1900. i 1995. -> pada
- **nepostojeći datum**: 31. april, 32. dan, dan 00, mjesec 00 i 13
- datum rođenja u budućnosti
- nedodijeljena oznaka regije 60–69, i opcija kojom se svejedno dozvoli
- regija izvan Bosne i Hercegovine
- **pogrešna kontrolna cifra**
- slučaj u kojem je kontrolna cifra 0 jer je `m` ispalo 11
- pomoćne funkcije: prestupne godine, dani u mjesecu, rekonstrukcija godine

Testovi koriste fiksni referentni datum umjesto stvarnog "danas", pa
provjera budućeg datuma neće početi padati kroz godinu dana.

Runner je napisan u samom `test.js` -> dvadesetak linija, jer za ovoliko
testova nema razloga vući cijeli framework.

---

## Šta sam dodala od sebe

**Razlog umjesto samo `false`.** Zadatak to i traži, ali sam otišla korak
dalje: uz rečenicu za korisnika ide i stabilan `kod` za program, jer
poruke se mijenjaju a kodovi ne.

**Poruke koje govore šta popraviti.** Ne "neispravan datum", nego
"1900. nije prestupna godina, pa 29. februar ne postoji". Kod pogrešne
kontrolne cifre ispisuje se i koja se cifra očekivala.

**Podaci iz ispravnog broja.** Kad broj prođe, vraća se datum rođenja,
broj godina, regija i pol, pa se biblioteka može koristiti i za
popunjavanje forme, ne samo za provjeru.

**Provjera budućeg datuma.** Standard je ne spominje, ali JMBG djeteta
koje se rodi za dvije godine ne postoji, pa se takav broj odbija.

**Opseg 60–69.** Odbija se po zadanim postavkama, ali postoji opcija
`dozvoliNedodijeljenuRegiju` za slučaj da neko obrađuje stare zapise.

**`dopuniKontrolnu()`.** Iz dvanaest cifara pravi ispravan trinaesti
znak. Koristila sam je da generišem testne brojeve umjesto da ih
izmišljam napamet -> inače bi polovina "ispravnih" primjera u testovima
bila pogrešna.

**Radi i u browseru.** Ako se `jmbg.js` učita preko `<script>`, funkcije
su dostupne kao `window.JMBG`.

---

## Napomena

Brojevi u testovima i primjerima su izmišljeni. Generisani su tako da
matematički prolaze provjeru, ali ne pripadaju nijednoj osobi.
