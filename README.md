# MT GROUP · Energy Run

Naršyklėje veikiantis bėgimo žaidimas (runner) MT GROUP komandai. Pagrindinis herojus yra įmonės įkūrėjas Mindaugas su kostiumu ir geltonu MT šalmu. Jis bėga iš Vilniaus per 18 Europos miestų, renka energiją ir paleidžia energetikos projektus. Visi darbuotojai varžosi bendroje rekordų lentelėje.

Žaidimas sukurtas kaip staigmena gimtadieniui, kuris yra **spalio 24 d.** Tą dieną automatiškai įsijungia gimtadienio režimas.

## Kaip žaisti

| Veiksmas | Telefone | Kompiuteryje |
|---|---|---|
| Šuolis | bakstelėk **dešinę** ekrano pusę | Tarpas / ↑ / W |
| Dvigubas šuolis | bakstelėk dar kartą ore | dar kartą Tarpas |
| Nusileisti / čiuožti (ore – greitas kritimas) | laikyk **kairę** ekrano pusę | ↓ / S |
| 🛡️ Skydas (3 s kliūtys nekenkia) | mygtukas virš „Čiuožti“ | Q |
| 🚀 Jetpack (4 s skrydis: dešinė / ↑ – aukštyn, kairė / ↓ – žemyn; kliūtys nekenkia) | mygtukas virš „Šuolis“ | E |
| Pauzė | ⏸ mygtukas | P / Esc |

- **Žaibai ⚡** suteikia taškų ir energijos. Už energiją Dirbtuvėse perkama įranga ir apranga.
- **3 projekto detalės** kiekviename mieste. Surinkęs visas, miesto gale paleidi projektą ★★★ ir gauni daugiklį +1.
- **Bėgimas be sustojimų:** darbų užduočių (mini žaidimų) nebėra. Daugiklis auga tik už ★★★ projektus.
- **Netikėtumai:** nuo krano vėlai nukrentantys kroviniai (po vieną, poromis arba dvigubo aukščio – tada reikia dvigubo šuolio) ir dronas, kuris atskrenda, pakimba matomoje vietoje, mirksi ir tada nusileidžia iki kelių aukščio – jį reikia peršokti. Vėlesnė bėgimo dalis greitesnė.
- **Gebėjimai:** skydą ir jetpack įkrauna bėgimo metu surinkti žaibai (skydui reikia 160, jetpack 120; panaudojus krūvis prasideda iš naujo). Kol veikia gebėjimas, krūvis nekaupiamas.
- **Galios priedai:** auksinis šalmas (apsaugo nuo vieno smūgio), transformatorius-magnetas, dronas (skrydis: dešinė pusė / ↑ – aukštyn, kairė / ↓ – žemyn), ekskavatorius (griauna kliūtis), sutartis x2.
- **Dienos iššūkis:** visi tą dieną gauna tą pačią trasą.
- Rekordų lentelės: visų laikų, šios savaitės ir dienos iššūkio.
- Trasoje stovi vėliavėlės: geltona – tavo atstumo rekordas, mėlyna – artimiausias kolega, kurį dar gali aplenkti.
- Pabaigos ekrane rodoma, į ką atsitrenkei, patarimas ir kiti tikslai: kita stotelė, kiek taškų trūksta iki aukštesnės vietos ir iki kito pirkinio Dirbtuvėse.
- Po pauzės (ar grįžus į naršyklę) bėgimas tęsiasi po atgalinio skaičiavimo 3-2-1. Telefonuose, kurie palaiko vibraciją, ji jaučiama surinkus detalę, žetoną, įjungus gebėjimą ir pan.

Maršrutas: Vilnius → Klaipėda → Ryga → Talinas → Helsinkis → Stokholmas → Kopenhaga → Hamburgas → Amsterdamas → Briuselis → Londonas → Paryžius → Madridas → Roma → Viena → Praha → Berlynas → Varšuva → vėl Vilnius (2-as ratas sunkesnis). MT GROUP projektų vietos (Vilnius, Klaipėdos SGD terminalas, Paldiskis, Kalundborgas, Brunsbüttel) pažymėtos atskirai.

## Paskyros

- Pirmą kartą žaidėjas įveda tik **vardą**. Paskyra išsaugoma naršyklės slapuke (HttpOnly, 2 metams).
- Ta pati naršyklė visada prisimena tą pačią paskyrą – nieko daryti nereikia.
- Jei žaidėjas nori neprarasti progreso (išvalius naršyklę ar žaidžiant kitame įrenginyje), profilyje gali **patvirtinti el. paštą** vienkartiniu 6 skaitmenų kodu (galioja 10 min., 5 bandymai). Po 3 bėgimų žaidimo pabaigoje tai pasiūloma (galima atidėti 7 dienoms).
- Kitame įrenginyje: pradžios ekrane „Jau žaidžiau – prisijungti el. paštu“. Jei toje naršyklėje jau buvo žaista kitu vardu, prieš sujungimą paklausiama sutikimo: energija, patobulinimai ir bėgimai perkeliami į el. paštu apsaugotą paskyrą.
- Laiškai siunčiami per [Resend](https://resend.com). Be `RESEND_API_KEY` ir `ACCOUNT_EMAIL_FROM` el. pašto patvirtinimas tiesiog išjungtas, žaisti galima toliau.
- Slaptažodžių nėra. Įmonės kodo nėra, todėl prisijungti gali bet kas, turintis nuorodą.

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

Duomenų bazė laikoma [Neon](https://neon.com) nemokamame plane (0,5 GB, neištrinama; kai niekas nežaidžia, išsijungia po 5 min.). Render'io nemokama PostgreSQL netinka, nes ištrinama po 30 dienų.

1. Neon → sukurk projektą (regionas Europoje, pvz. Frankfurtas) ir nusikopijuok *connection string* (baigiasi `?sslmode=require`).
2. Render → **New → Blueprint** → pasirink repozitoriją `mt-energy-run`. `render.yaml` sukurs web servisą ir paklaus `DATABASE_URL` – įklijuok Neon adresą.
3. Palauk, kol baigsis „deploy“. Atidaryk servisą ir patikrink `https://<adresas>/healthz`. Turi būti `"storage":"postgres"`.
4. Administratoriaus raktą rasi serviso **Environment → ADMIN_TOKEN**. Administravimas: `https://<adresas>/admin`.

Atsarginė kopija (kompiuteryje su PostgreSQL įrankiais): `pg_dump "<Neon adresas>" --no-owner --no-acl > backup.sql`.

> Nemokamas web servisas po neveiklumo „užmiega“, todėl pirmas atidarymas gali užtrukti ~30 s.

Aplinkos kintamieji:

| Kintamasis | Paskirtis |
|---|---|
| `DATABASE_URL` | PostgreSQL (Neon *connection string*). Lentelės sukuriamos automatiškai. |
| `ADMIN_TOKEN` | Raktas `/admin` puslapiui. Be jo administravimas išjungtas. |
| `RESEND_API_KEY` | Resend API raktas el. pašto kodams siųsti. |
| `ACCOUNT_EMAIL_FROM` | Siuntėjas, pvz. `MT Energy Run <zaidimas@jusu-domenas.lt>` (domenas turi būti patvirtintas Resend'e). |
| `ACCOUNT_SECRET` | Atsitiktinė eilutė kodų maišai (Render sugeneruoja automatiškai). |
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

Serveris trasą atkuria iš to paties `seed` ir tikrina, ar pateikti skaičiai (žaibai, detalės, taškai, laikas) yra įmanomi.

Grafika piešiama kodu (vektoriai Canvas'e), todėl išorinių paveikslėlių, išskyrus MT GROUP logotipą, nėra. Muzika ir garsai sintezuojami Web Audio API, licencijų nereikia. Šriftai Barlow ir Roboto Slab naudojami pagal SIL OFL / Apache 2.0 licencijas.

## Bonus kabelių tunelis

Kiekviename bėgime: pirmas tunelis ~550–850 m, vėliau kas ~1,3–1,9 km (vieta priklauso nuo bėgimo seed, serveris ją perskaičiuoja).
Herojus įbėga į MT kabelių tunelį ir ~24 s bėga „Temple Run“ principu, vaizdas už nugaros:
trys juostos (braukti ← → arba ← → / A D), šuolis (braukti ↑ / tarpas), čiuožimas (braukti ↓ / ↓),
posūkiai – prie rodyklės braukti jos kryptimi. Tunelyje surinkta energija ir taškai ×5,
o atsitrenkus žaidimas nesibaigia – herojus išlenda pro liuką į trasą ir bėga toliau.
Serveris tikrina `tunnelBolts` pagal tame bėgime galimus tunelio žaibus. `?notunnel` išjungia tunelius (testavimui).
