# MT GROUP · Energy Run

Naršyklėje veikiantis bėgimo žaidimas (runner) MT GROUP komandai. Pagrindinis herojus yra įmonės įkūrėjas Mindaugas su kostiumu ir geltonu MT šalmu. Jis bėga iš Vilniaus per 18 Europos miestų, renka energiją ir paleidžia energetikos projektus. Visi darbuotojai varžosi bendroje rekordų lentelėje.

Žaidimas sukurtas kaip staigmena gimtadieniui, kuris yra **spalio 24 d.** Tą dieną automatiškai įsijungia gimtadienio režimas.

## Kaip žaisti

| Veiksmas | Telefone | Kompiuteryje |
|---|---|---|
| Šuolis (laikyk – aukščiau) | bakstelėk **dešinę** ekrano pusę | Tarpas / ↑ / W |
| Dvigubas šuolis | bakstelėk dar kartą ore | dar kartą Tarpas |
| Nusileisti / čiuožti (ore – greitas kritimas) | laikyk **kairę** ekrano pusę | ↓ / S |
| Pauzė | ⏸ mygtukas | P / Esc |

- **Žaibai ⚡** suteikia taškų ir energijos. Už energiją Dirbtuvėse perkama įranga ir apranga.
- **3 projekto detalės** kiekviename mieste. Surinkęs visas, miesto gale paleidi projektą ★★★ ir gauni daugiklį +1.
- **Darbų užduotis** (oranžinis rombas) paleidžia 5 sekundžių mini žaidimą: laidai, įtampos matuoklis, vožtuvai arba varžtai. Sėkmė duoda daugiklį +1.
- **Galios priedai:** auksinis šalmas (apsaugo nuo vieno smūgio), transformatorius-magnetas, dronas (skrydis), ekskavatorius (griauna kliūtis), sutartis x2.
- **Dienos iššūkis:** visi tą dieną gauna tą pačią trasą.
- Rekordų lentelės: visų laikų, šios savaitės ir dienos iššūkio.

Maršrutas: Vilnius → Klaipėda → Ryga → Talinas → Helsinkis → Stokholmas → Kopenhaga → Hamburgas → Amsterdamas → Briuselis → Londonas → Paryžius → Madridas → Roma → Viena → Praha → Berlynas → Varšuva → vėl Vilnius (2-as ratas sunkesnis). MT GROUP projektų vietos (Vilnius, Klaipėdos SGD terminalas, Paldiskis, Kalundborgas, Brunsbüttel) pažymėtos atskirai.

## Paskyros

- Pirmą kartą žaidėjas įveda tik **vardą**. Paskyra išsaugoma naršyklės slapuke (HttpOnly, 2 metams).
- Žaidėjas gauna **atkūrimo kodą** (pvz. `VEJAS-7K4P2Q`). Su juo prisijungiama kitame įrenginyje. Profilyje galima sukurti naują kodą (senasis tada nustoja veikti).
- Jokių el. paštų ar slaptažodžių. Įmonės kodo nėra, todėl prisijungti gali bet kas, turintis nuorodą.

## Paleidimas lokaliai

```bash
npm install
npm start            # http://localhost:3000 (be DATABASE_URL duomenys laikomi atmintyje)
npm run check        # sintaksės patikra
npm test             # visi testai
```

PostgreSQL testams nustatyk `TEST_DATABASE_URL=postgres://...`.

Kūrėjo įrankiai:
- `/dev/preview.html?view=character|outfits|face|expressions|landmarks` – piešinių peržiūra. `face` rodo veidą be šalmo ir su pasirinkta apranga; `expressions` – šypseną, džiaugsmą, susidūrimą ir mirksėjimą. Galima pridėti `&outfit=tux`, `&expression=grin` arba `&blink`.
- `/?debug&practice&city=11` – pradėti nuo 12-o miesto (Paryžius), rezultatas nesaugomas.
- `/?debug&practice&autoplay` – žaidžia autopilotas. `&at=580` – pradėti nuo 580 m. `&birthday` – gimtadienio režimas.

## Paleidimas Render'yje

Projektas visiškai atskirtas nuo *Penkto gurkšnio*: atskira repozitorija, atskiras Render servisas ir atskira duomenų bazė.

1. Render → **New → Blueprint** → pasirink repozitoriją `mt-energy-run`. `render.yaml` sukurs web servisą ir PostgreSQL duomenų bazę.
2. Palauk, kol baigsis „deploy“. Atidaryk servisą ir patikrink `https://<adresas>/healthz`. Turi būti `"storage":"postgres"`.
3. Administratoriaus raktą rasi serviso **Environment → ADMIN_TOKEN**. Administravimas: `https://<adresas>/admin`.

> ⚠️ Render'io nemokama PostgreSQL duomenų bazė ištrinama po 30 dienų. Kad rekordai išliktų ilgiau, duomenų bazei pasirink mokamą planą (pvz. *Basic 256 MB*). Nemokamas web servisas po neveiklumo „užmiega“, todėl pirmas atidarymas gali užtrukti ~30 s. Gimtadienio dienai rekomenduojamas bent *Starter* planas.

Aplinkos kintamieji:

| Kintamasis | Paskirtis |
|---|---|
| `DATABASE_URL` | PostgreSQL. Lentelės sukuriamos automatiškai. |
| `ADMIN_TOKEN` | Raktas `/admin` puslapiui. Be jo administravimas išjungtas. |
| `BIRTHDAY_MODE` | `auto` (spalio 24 d. pagal Vilniaus laiką), `on` arba `off`. |
| `BIRTHDAY` | Gimtadienio data `MM-DD` (numatyta `10-24`). |
| `DATABASE_SSL=1` | Priverstinis TLS, kai naudojamas išorinis DB adresas. |

## Administravimas (`/admin`)

Ten matosi žaidėjų sąrašas su rekordais. Galima pervadinti žaidėją, jį užblokuoti (dingsta iš lentelių) arba ištrinti. Serveris neįskaito įtartinų rezultatų (per greitai, per daug taškų ar žaibų nei įmanoma trasoje). Juos galima peržiūrėti ir, jei reikia, įskaityti rankiniu būdu.

## Architektūra

```
server.mjs            HTTP serveris (Node, be framework'ų)
server/app.mjs        API, slapukai, statiniai failai, CSP
server/rules.mjs      rezultatų tikrinimas, pasiekimai, parduotuvė
server/store-*.mjs    PostgreSQL / atminties saugykla (vienoda sąsaja)
shared/               bendras kodas naršyklei ir serveriui:
  config.js           maršrutas, fizika, upgrade'ai, pasiekimai
  worldgen.js         deterministinis trasų generatorius (seed)
  sim.js              žaidimo simuliacija (fizika, susidūrimai, taškai)
  bot.js              autopilotas (testams ir meniu fonui)
public/js/render/     Canvas piešimas: veikėjas, miestai, įžymybės, objektai
public/js/ui/         HUD, mini žaidimai, ikonos
public/js/main.js     ekranai, paskyra, parduotuvė, lentelės
```

Serveris trasą atkuria iš to paties `seed` ir tikrina, ar pateikti skaičiai (žaibai, detalės, užduotys, taškai, laikas) yra įmanomi.

Grafika piešiama kodu (vektoriai Canvas'e), todėl išorinių paveikslėlių, išskyrus MT GROUP logotipą, nėra. Muzika ir garsai sintezuojami Web Audio API, licencijų nereikia. Šriftai Barlow ir Roboto Slab naudojami pagal SIL OFL / Apache 2.0 licencijas.
