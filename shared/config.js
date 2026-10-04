// Shared game configuration. Imported by the browser (served at /shared/) and by
// the server (run validation, shop, achievements). Keep it free of DOM / Node APIs.

export const GAME_VERSION = '1.0.0';

export const BRAND = {
  yellow: '#FFD800',
  charcoal: '#1E1E1E',
};

// ---------------------------------------------------------------------------
// Physics (meters, seconds)
// ---------------------------------------------------------------------------
export const PHYSICS = {
  gravity: 52,
  jumpVelocity: 15.2,
  doubleJumpVelocity: 13.4,
  fastFallVelocity: -24,
  coyoteTime: 0.1,
  jumpBuffer: 0.13,
  minSlide: 0.42,
  playerWidth: 0.62,
  playerHeight: 1.62,
  slideHeight: 0.78,
  playerScreenX: 5.2, // meters from the left edge of the view
};

export const SPEED = {
  min: 10,
  max: 24.5,
  ramp: 3600, // meters; larger = slower ramp
};

/** Nominal run speed (m/s) at a given distance. Deterministic, never depends on player actions. */
export function speedAt(distance) {
  const d = Math.max(0, distance);
  return SPEED.min + (SPEED.max - SPEED.min) * (1 - Math.exp(-d / SPEED.ramp));
}

/** Minimum time (s) needed to cover `distance` at the nominal speed curve. */
export function minTimeFor(distance) {
  // Numerical integral of 1/v(d); 2 m steps are plenty accurate.
  let t = 0;
  const step = 2;
  for (let d = 0; d < distance; d += step) {
    const s = Math.min(step, distance - d);
    t += s / speedAt(d + s / 2);
  }
  return t;
}

// ---------------------------------------------------------------------------
// Route across Europe. `mt` marks a place where MT GROUP actually builds.
// Lengths are in meters of running.
// ---------------------------------------------------------------------------
export const CITIES = [
  {
    id: 'vilnius', flag: '🇱🇹', length: 650, lat: 54.69, lon: 25.28, mt: true, theme: 'baltic',
    name: { lt: 'Vilnius', en: 'Vilnius' }, country: { lt: 'Lietuva', en: 'Lithuania' },
    // the Vilnius leg ends at Rietavas, where MT GROUP builds the battery park
    project: { type: 'bess', lt: 'Rietavo baterijų parkas 140 MWh', en: 'Rietavas 140 MWh battery park' },
    landmarks: ['gediminas', 'cathedral', 'tvtower'], sky: 'morning',
    // checkpoints on the road to Klaipėda (not separate route stops)
    waypoints: [
      {
        id: 'raseiniai', from: 200, to: 400, theme: 'town', sights: [['raseiniaichurch', 0.12, 1.15], ['zemaitis', 0.45, 1.45]],
        name: { lt: 'Raseiniai', en: 'Raseiniai' },
        sub: { lt: 'Žemaičių krašto vartai · paminklas „Žemaitis“', en: 'Gateway to Samogitia · “Žemaitis” monument' },
      },
      {
        id: 'rietavas', from: 400, to: 650, theme: 'town', sights: [['rietavaschurch', 0.1, 1.15]], market: true,
        name: { lt: 'Rietavas', en: 'Rietavas' },
        sub: { lt: 'Rietavo turgus · MT GROUP baterijų parkas 140 MWh', en: 'Rietavas market · MT GROUP 140 MWh battery park' },
      },
    ],
  },
  {
    id: 'klaipeda', flag: '🇱🇹', length: 720, lat: 55.71, lon: 21.13, mt: true, theme: 'port',
    name: { lt: 'Klaipėda', en: 'Klaipėda' }, country: { lt: 'Lietuva', en: 'Lithuania' },
    project: { type: 'lng', lt: 'SGD terminalas „Independence“', en: '“Independence” LNG terminal' },
    landmarks: ['fsru', 'portcranes', 'meridian'], sky: 'morning',
  },
  {
    id: 'riga', flag: '🇱🇻', length: 760, lat: 56.95, lon: 24.11, mt: false, theme: 'baltic',
    name: { lt: 'Ryga', en: 'Riga' }, country: { lt: 'Latvija', en: 'Latvia' },
    project: { type: 'gas', lt: 'Dujų kompresorių stotis', en: 'Gas compressor station' },
    landmarks: ['stpeters', 'freedom', 'blackheads'], sky: 'midmorning',
  },
  {
    id: 'tallinn', flag: '🇪🇪', length: 780, lat: 59.44, lon: 24.75, mt: true, theme: 'port',
    name: { lt: 'Talinas', en: 'Tallinn' }, country: { lt: 'Estija', en: 'Estonia' },
    project: { type: 'pipeline', lt: 'Paldiskio jūrinis vamzdynas', en: 'Paldiski offshore pipeline' },
    landmarks: ['toompea', 'olaf', 'fatmargaret'], sky: 'midmorning',
  },
  {
    id: 'helsinki', flag: '🇫🇮', length: 800, lat: 60.17, lon: 24.94, mt: false, theme: 'nordic',
    name: { lt: 'Helsinkis', en: 'Helsinki' }, country: { lt: 'Suomija', en: 'Finland' },
    project: { type: 'offshorewind', lt: 'Jūrinis vėjo parkas', en: 'Offshore wind farm' },
    landmarks: ['helsinkicathedral', 'uspenski', 'ferriswheel'], sky: 'noon',
  },
  {
    id: 'stockholm', flag: '🇸🇪', length: 820, lat: 59.33, lon: 18.07, mt: false, theme: 'nordic',
    name: { lt: 'Stokholmas', en: 'Stockholm' }, country: { lt: 'Švedija', en: 'Sweden' },
    project: { type: 'bess', lt: 'Baterijų kaupimo parkas', en: 'Battery storage park' },
    landmarks: ['cityhall', 'riddarholmen', 'globe'], sky: 'noon',
  },
  {
    id: 'copenhagen', flag: '🇩🇰', length: 840, lat: 55.68, lon: 12.57, mt: true, theme: 'nordic',
    name: { lt: 'Kopenhaga', en: 'Copenhagen' }, country: { lt: 'Danija', en: 'Denmark' },
    project: { type: 'ccs', lt: 'Kalundborgo CO₂ surinkimas', en: 'Kalundborg CO₂ capture' },
    landmarks: ['nyhavn', 'christiansborg', 'windmills'], sky: 'afternoon',
  },
  {
    id: 'hamburg', flag: '🇩🇪', length: 860, lat: 53.55, lon: 9.99, mt: true, theme: 'port',
    name: { lt: 'Hamburgas', en: 'Hamburg' }, country: { lt: 'Vokietija', en: 'Germany' },
    project: { type: 'lng', lt: 'Brunsbüttelio SGD terminalas', en: 'Brunsbüttel LNG terminal' },
    landmarks: ['elbphilharmonie', 'portcranes', 'michel'], sky: 'afternoon',
  },
  {
    id: 'amsterdam', flag: '🇳🇱', length: 860, lat: 52.37, lon: 4.9, mt: false, theme: 'dutch',
    name: { lt: 'Amsterdamas', en: 'Amsterdam' }, country: { lt: 'Nyderlandai', en: 'Netherlands' },
    project: { type: 'biogas', lt: 'Biodujų jėgainė', en: 'Biogas plant' },
    landmarks: ['canalhouses', 'windmill', 'westerkerk'], sky: 'afternoon',
  },
  {
    id: 'brussels', flag: '🇧🇪', length: 860, lat: 50.85, lon: 4.35, mt: false, theme: 'western',
    name: { lt: 'Briuselis', en: 'Brussels' }, country: { lt: 'Belgija', en: 'Belgium' },
    project: { type: 'substation', lt: 'Aukštos įtampos pastotė', en: 'High-voltage substation' },
    landmarks: ['atomium', 'townhall', 'berlaymont'], sky: 'lateafternoon',
  },
  {
    id: 'london', flag: '🇬🇧', length: 880, lat: 51.51, lon: -0.13, mt: false, theme: 'london',
    name: { lt: 'Londonas', en: 'London' }, country: { lt: 'Jungtinė Karalystė', en: 'United Kingdom' },
    project: { type: 'offshorewind', lt: 'Šiaurės jūros vėjo parkas', en: 'North Sea wind farm' },
    landmarks: ['bigben', 'londoneye', 'shard'], sky: 'lateafternoon',
  },
  {
    id: 'paris', flag: '🇫🇷', length: 900, lat: 48.86, lon: 2.35, mt: false, theme: 'paris',
    name: { lt: 'Paryžius', en: 'Paris' }, country: { lt: 'Prancūzija', en: 'France' },
    project: { type: 'solar', lt: 'Saulės elektrinė', en: 'Solar power plant' },
    landmarks: ['eiffel', 'arc', 'sacrecoeur'], sky: 'sunset',
  },
  {
    id: 'madrid', flag: '🇪🇸', length: 900, lat: 40.42, lon: -3.7, mt: false, theme: 'south',
    name: { lt: 'Madridas', en: 'Madrid' }, country: { lt: 'Ispanija', en: 'Spain' },
    project: { type: 'solar', lt: 'Saulės parkas „Meseta“', en: '“Meseta” solar park' },
    landmarks: ['alcala', 'metropolis', 'kio'], sky: 'dusk',
  },
  {
    id: 'rome', flag: '🇮🇹', length: 920, lat: 41.9, lon: 12.5, mt: false, theme: 'south',
    name: { lt: 'Roma', en: 'Rome' }, country: { lt: 'Italija', en: 'Italy' },
    project: { type: 'hydrogen', lt: 'Vandenilio slėnis', en: 'Hydrogen valley' },
    landmarks: ['colosseum', 'stpeterrome', 'pines'], sky: 'night',
  },
  {
    id: 'vienna', flag: '🇦🇹', length: 920, lat: 48.21, lon: 16.37, mt: false, theme: 'central',
    name: { lt: 'Viena', en: 'Vienna' }, country: { lt: 'Austrija', en: 'Austria' },
    project: { type: 'gas', lt: 'Dujų skirstymo mazgas', en: 'Gas distribution hub' },
    landmarks: ['stephansdom', 'riesenrad', 'karlskirche'], sky: 'night',
  },
  {
    id: 'prague', flag: '🇨🇿', length: 940, lat: 50.08, lon: 14.44, mt: false, theme: 'central',
    name: { lt: 'Praha', en: 'Prague' }, country: { lt: 'Čekija', en: 'Czechia' },
    project: { type: 'bess', lt: 'Tinklo baterijų sistema', en: 'Grid battery system' },
    landmarks: ['tyn', 'charlesbridge', 'castle'], sky: 'predawn',
  },
  {
    id: 'berlin', flag: '🇩🇪', length: 960, lat: 52.52, lon: 13.4, mt: false, theme: 'central',
    name: { lt: 'Berlynas', en: 'Berlin' }, country: { lt: 'Vokietija', en: 'Germany' },
    project: { type: 'substation', lt: 'Jungiamoji pastotė', en: 'Interconnector substation' },
    landmarks: ['brandenburg', 'fernsehturm', 'reichstag'], sky: 'dawn',
  },
  {
    id: 'warsaw', flag: '🇵🇱', length: 980, lat: 52.23, lon: 21.01, mt: false, theme: 'central',
    name: { lt: 'Varšuva', en: 'Warsaw' }, country: { lt: 'Lenkija', en: 'Poland' },
    project: { type: 'ccs', lt: 'Anglies surinkimo įrenginys', en: 'Carbon capture unit' },
    landmarks: ['pkin', 'varsoskyline', 'zamek'], sky: 'sunrise',
  },
];

export const ROUTE_LENGTH = CITIES.reduce((s, c) => s + c.length, 0);

/** Lap 2+ cities get longer and the run continues forever. */
export function cityLength(index) {
  const lap = Math.floor(index / CITIES.length);
  return CITIES[index % CITIES.length].length + lap * 120;
}

/** Returns { index, lap, city, start, end, progress } for an absolute distance. */
export function cityAt(distance) {
  let start = 0;
  for (let i = 0; i < 10000; i++) {
    const len = cityLength(i);
    if (distance < start + len) {
      return {
        index: i,
        lap: Math.floor(i / CITIES.length),
        city: CITIES[i % CITIES.length],
        start,
        end: start + len,
        progress: (distance - start) / len,
      };
    }
    start += len;
  }
  throw new Error('distance out of range');
}

/** Checkpoint (waypoint) at an absolute distance, or null. */
export function waypointAt(distance) {
  const ca = cityAt(distance);
  const wps = ca.city.waypoints;
  if (!wps) return null;
  const rel = distance - ca.start;
  for (const w of wps) if (rel >= w.from && rel < w.to) return { ...w, cityIndex: ca.index, start: ca.start + w.from, end: ca.start + w.to };
  return null;
}

/**
 * Route legs for the HUD: every city and every checkpoint is a stop.
 * Returns { cur, next, progress } where stops are { name, flag, x, checkpoint }.
 */
export function legAt(distance) {
  const ca = cityAt(distance);
  const stopsOf = (i) => {
    const c = CITIES[i % CITIES.length];
    const s = cityStart(i);
    const out = [];
    for (const w of c.waypoints || []) out.push({ name: w.name, flag: c.flag, x: s + w.from, checkpoint: true });
    out.push({ name: c.name, flag: c.flag, x: s, checkpoint: false, index: i });
    return out.sort((p, q) => p.x - q.x);
  };
  const stops = [...(ca.index > 0 ? stopsOf(ca.index - 1) : []), ...stopsOf(ca.index), ...stopsOf(ca.index + 1)];
  let k = 0;
  for (let j = 0; j < stops.length; j++) if (stops[j].x <= distance) k = j;
  const cur = stops[k];
  const next = stops[k + 1] || stops[k];
  const progress = next.x > cur.x ? Math.min(1, Math.max(0, (distance - cur.x) / (next.x - cur.x))) : 0;
  return { cur, next, progress };
}

export function cityStart(index) {
  let s = 0;
  for (let i = 0; i < index; i++) s += cityLength(i);
  return s;
}

// ---------------------------------------------------------------------------
// Power-ups
// ---------------------------------------------------------------------------
// Abilities the player triggers (buttons / Q, E). Charged by bolts collected
// during the run and emptied on use, so they come rarely: about once per 1-2 km.
export const ABILITIES = {
  shield: { cost: 160, duration: 3 }, // obstacles pass through the hero
  wave: { cost: 120, range: 22 }, // pulls every bolt ahead within `range` meters
};

export const POWERUPS = {
  magnet: { icon: 'magnet', base: 7, perLevel: 1.6 },
  drone: { icon: 'drone', base: 5, perLevel: 0.9 },
  excavator: { icon: 'excavator', base: 5, perLevel: 1.0 },
  double: { icon: 'double', base: 8, perLevel: 1.6 },
  helmet: { icon: 'helmet', base: 0, perLevel: 0 },
};

// ---------------------------------------------------------------------------
// Upgrades (bought with ⚡ energy). Capped on purpose: a fully upgraded player is
// roughly 20–25 % stronger, so skill still decides the leaderboard.
// ---------------------------------------------------------------------------
export const UPGRADES = [
  { id: 'magnet', icon: 'magnet', costs: [120, 260, 480, 800, 1300], lt: 'Transformatorius-magnetas', en: 'Transformer magnet', descLt: 'Ilgiau traukia energiją', descEn: 'Pulls energy for longer' },
  { id: 'drone', icon: 'drone', costs: [150, 320, 560, 900, 1400], lt: 'Inspekcinis dronas', en: 'Inspection drone', descLt: 'Ilgesnis skrydis virš kliūčių', descEn: 'Longer flight over obstacles' },
  { id: 'excavator', icon: 'excavator', costs: [150, 320, 560, 900, 1400], lt: 'Ekskavatorius', en: 'Excavator', descLt: 'Ilgiau griauna kliūtis', descEn: 'Smashes obstacles for longer' },
  { id: 'double', icon: 'double', costs: [200, 420, 750, 1150, 1700], lt: 'Sutartis x2', en: 'Contract x2', descLt: 'Ilgiau galioja dvigubi taškai', descEn: 'Double points last longer' },
  { id: 'energyValue', icon: 'bolt', costs: [180, 400, 700, 1100, 1600], lt: 'Efektyvumas', en: 'Efficiency', descLt: '+10 % ⚡ už kiekvieną žaibą', descEn: '+10 % ⚡ per bolt' },
  { id: 'startMult', icon: 'mult', costs: [900, 2200], lt: 'Patirtis', en: 'Experience', descLt: 'Bėgimą pradedi su didesniu daugikliu', descEn: 'Start each run with a higher multiplier' },
  { id: 'startHelmet', icon: 'helmet', costs: [1500], lt: 'Auksinis šalmas', en: 'Golden helmet', descLt: 'Kiekvieną bėgimą pradedi su apsauga', descEn: 'Start every run protected' },
  { id: 'secondChance', icon: 'heart', costs: [2500], lt: 'Antras šansas', en: 'Second chance', descLt: 'Kartą per bėgimą tęsi po smūgio', descEn: 'Continue once per run after a crash' },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export function powerupDuration(kind, upgrades = {}) {
  const p = POWERUPS[kind];
  return p.base + p.perLevel * (upgrades[kind] || 0);
}

export function boltValue(upgrades = {}) {
  return 1 + 0.1 * (upgrades.energyValue || 0);
}

// ---------------------------------------------------------------------------
// Cosmetics (look only, never gameplay)
// ---------------------------------------------------------------------------
export const COSMETICS = [
  { id: 'suit', cost: 0, lt: 'Firminis kostiumas', en: 'Signature suit' },
  { id: 'vest', cost: 400, lt: 'Statybų aikštelė', en: 'Site visit' },
  { id: 'overalls', cost: 900, lt: 'MT kombinezonas', en: 'MT overalls' },
  { id: 'tux', cost: 1600, lt: 'Gala vakaras', en: 'Gala night' },
  { id: 'birthday', cost: 0, gift: true, lt: 'Gimtadienio kostiumas', en: 'Birthday suit' },
  { id: 'gold', cost: 0, achievement: 'grandtour', lt: 'Auksinis kostiumas', en: 'Golden suit' },
];

export const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
export const SCORE = {
  bolt: 10,
  token: 500,
  part: 100,
  taskSuccess: 300,
  gateBase: 300,
  gatePerCity: 100,
  gatePerStar: 150,
  maxMult: 15,
  tokenEnergy: 25,
  starEnergy: 15,
};

// ---------------------------------------------------------------------------
// Achievements (energy rewards). `check` runs on the server after a valid run.
// ---------------------------------------------------------------------------
export const ACHIEVEMENTS = [
  { id: 'firstrun', reward: 50, lt: 'Pirmas žingsnis', en: 'First step', descLt: 'Užbaik pirmą bėgimą', descEn: 'Finish your first run' },
  { id: 'km1', reward: 100, lt: 'Kilometras', en: 'One kilometre', descLt: 'Nubėk 1 km per vieną bėgimą', descEn: 'Run 1 km in one run' },
  { id: 'km3', reward: 250, lt: 'Ilgas objektas', en: 'Long haul', descLt: 'Nubėk 3 km per vieną bėgimą', descEn: 'Run 3 km in one run' },
  { id: 'km6', reward: 500, lt: 'Magistralė', en: 'Trunk line', descLt: 'Nubėk 6 km per vieną bėgimą', descEn: 'Run 6 km in one run' },
  { id: 'riga', reward: 100, lt: 'Pirmoji siena', en: 'First border', descLt: 'Pasiek Rygą', descEn: 'Reach Riga' },
  { id: 'copenhagen', reward: 250, lt: 'Per Baltijos jūrą', en: 'Across the Baltic', descLt: 'Pasiek Kopenhagą', descEn: 'Reach Copenhagen' },
  { id: 'paris', reward: 500, lt: 'Paryžiaus šviesos', en: 'City of lights', descLt: 'Pasiek Paryžių', descEn: 'Reach Paris' },
  { id: 'grandtour', reward: 1500, lt: 'Didysis turas', en: 'Grand tour', descLt: 'Apibėk visą Europą ir grįžk į Vilnių', descEn: 'Run all of Europe back to Vilnius' },
  { id: 'stars3', reward: 100, lt: 'Projektas iki rakto', en: 'Turnkey', descLt: 'Surink visas 3 projekto detales mieste', descEn: 'Collect all 3 project parts in a city' },
  { id: 'tasks5', reward: 150, lt: 'Meistras', en: 'Craftsman', descLt: 'Atlik 5 darbų užduotis per bėgimą', descEn: 'Complete 5 site tasks in one run' },
  { id: 'mult10', reward: 300, lt: 'Dešimtukas', en: 'Perfect ten', descLt: 'Pasiek x10 daugiklį', descEn: 'Reach a x10 multiplier' },
  { id: 'score50k', reward: 300, lt: '50 000 taškų', en: '50,000 points', descLt: 'Surink 50 000 taškų', descEn: 'Score 50,000 points' },
  { id: 'score250k', reward: 1000, lt: 'Ketvirtis milijono', en: 'Quarter million', descLt: 'Surink 250 000 taškų', descEn: 'Score 250,000 points' },
  { id: 'bolts5000', reward: 400, lt: 'Elektrinė', en: 'Power plant', descLt: 'Iš viso surink 5 000 žaibų', descEn: 'Collect 5,000 bolts in total' },
  { id: 'runs25', reward: 300, lt: 'Atkaklumas', en: 'Persistence', descLt: 'Sužaisk 25 bėgimus', descEn: 'Play 25 runs' },
  { id: 'daily', reward: 100, lt: 'Dienos iššūkis', en: 'Daily challenger', descLt: 'Sužaisk dienos iššūkį', descEn: 'Play a daily challenge' },
  { id: 'birthday', reward: 240, lt: 'Su gimtadieniu!', en: 'Happy birthday!', descLt: 'Bėk spalio 24-ąją', descEn: 'Run on October 24th' },
  { id: 'bdaygift', reward: 1024, lt: 'Dovana Mindaugui', en: 'A gift for Mindaugas', descLt: 'Spalio 24-ąją surink bent 2 410 taškų', descEn: 'Score at least 2,410 on October 24th' },
  // route
  { id: 'raseiniai', reward: 40, lt: 'Žemaičių vartai', en: 'Gateway to Samogitia', descLt: 'Pasiek Raseinius', descEn: 'Reach Raseiniai' },
  { id: 'rietavas', reward: 60, lt: 'Turgaus diena', en: 'Market day', descLt: 'Pasiek Rietavo turgų', descEn: 'Reach the Rietavas market' },
  { id: 'klaipeda', reward: 80, lt: 'Uostamiestis', en: 'Port city', descLt: 'Pasiek Klaipėdą', descEn: 'Reach Klaipėda' },
  { id: 'tallinn', reward: 150, lt: 'Baltijos kelias', en: 'The Baltic Way', descLt: 'Pasiek Taliną', descEn: 'Reach Tallinn' },
  { id: 'stockholm', reward: 200, lt: 'Šiaurės žvaigždė', en: 'North star', descLt: 'Pasiek Stokholmą', descEn: 'Reach Stockholm' },
  { id: 'mtsites', reward: 350, lt: 'Visi MT objektai', en: 'Every MT site', descLt: 'Aplankyk visus MT GROUP objektus iki Hamburgo', descEn: 'Visit every MT GROUP site up to Hamburg' },
  { id: 'london', reward: 400, lt: 'Arbatėlė Londone', en: 'Tea in London', descLt: 'Pasiek Londoną', descEn: 'Reach London' },
  { id: 'rome', reward: 700, lt: 'Visi keliai veda į Romą', en: 'All roads lead to Rome', descLt: 'Pasiek Romą', descEn: 'Reach Rome' },
  { id: 'berlin', reward: 1000, lt: 'Berlyno vartai', en: 'Brandenburg gate', descLt: 'Pasiek Berlyną', descEn: 'Reach Berlin' },
  { id: 'lap2', reward: 2000, lt: 'Antras ratas', en: 'Second lap', descLt: 'Apibėk Europą ir pasiek Klaipėdą antrą kartą', descEn: 'Lap Europe and reach Klaipėda again' },
  // single run
  { id: 'km10', reward: 800, lt: 'Dešimt kilometrų', en: 'Ten kilometres', descLt: 'Nubėk 10 km per vieną bėgimą', descEn: 'Run 10 km in one run' },
  { id: 'bolts300', reward: 200, lt: 'Aukšta įtampa', en: 'High voltage', descLt: 'Surink 300 žaibų per vieną bėgimą', descEn: 'Collect 300 bolts in one run' },
  { id: 'tokens3', reward: 250, lt: 'Auksinė trijulė', en: 'Golden trio', descLt: 'Surink 3 MT žetonus per vieną bėgimą', descEn: 'Collect 3 MT tokens in one run' },
  { id: 'perfect3', reward: 400, lt: 'Trys projektai iki rakto', en: 'Three turnkey projects', descLt: 'Surink visas detales 3 miestuose per vieną bėgimą', descEn: 'Collect every part in 3 cities in one run' },
  { id: 'nofail', reward: 250, lt: 'Be priekaištų', en: 'Flawless', descLt: 'Atlik 4 užduotis per bėgimą be nė vienos klaidos', descEn: 'Complete 4 site tasks in a run without a miss' },
  { id: 'mult15', reward: 800, lt: 'Maksimali galia', en: 'Full power', descLt: 'Pasiek x15 daugiklį', descEn: 'Reach the x15 multiplier' },
  { id: 'smash10', reward: 200, lt: 'Griovimo brigada', en: 'Demolition crew', descLt: 'Ekskavatoriumi sugriauk 10 kliūčių per bėgimą', descEn: 'Smash 10 obstacles with the excavator in one run' },
  { id: 'power8', reward: 200, lt: 'Visas arsenalas', en: 'Full arsenal', descLt: 'Paimk 8 galios priedus per vieną bėgimą', descEn: 'Grab 8 power-ups in one run' },
  { id: 'score100k', reward: 600, lt: 'Šimtas tūkstančių', en: 'One hundred thousand', descLt: 'Surink 100 000 taškų', descEn: 'Score 100,000 points' },
  { id: 'score500k', reward: 2500, lt: 'Pusė milijono', en: 'Half a million', descLt: 'Surink 500 000 taškų', descEn: 'Score 500,000 points' },
  { id: 'revive', reward: 100, lt: 'Antras kvėpavimas', en: 'Second wind', descLt: 'Pasinaudok antru šansu ir nubėk dar 500 m', descEn: 'Use a second chance and keep going for 500 m' },
  // career
  { id: 'marathon', reward: 500, lt: 'Maratonas', en: 'Marathon', descLt: 'Iš viso nubėk 42,195 km', descEn: 'Run 42.195 km in total' },
  { id: 'km200', reward: 1500, lt: 'Vilnius–Klaipėda ir atgal', en: 'There and back again', descLt: 'Iš viso nubėk 600 km', descEn: 'Run 600 km in total' },
  { id: 'bolts25000', reward: 1200, lt: 'Atominė elektrinė', en: 'Power station', descLt: 'Iš viso surink 25 000 žaibų', descEn: 'Collect 25,000 bolts in total' },
  { id: 'tokens25', reward: 600, lt: 'Žetonų kolekcija', en: 'Token collection', descLt: 'Iš viso surink 25 MT žetonus', descEn: 'Collect 25 MT tokens in total' },
  { id: 'tasks50', reward: 600, lt: 'Darbų vadovas', en: 'Site manager', descLt: 'Iš viso atlik 50 darbų užduočių', descEn: 'Complete 50 site tasks in total' },
  { id: 'stars10', reward: 800, lt: 'Dešimt objektų', en: 'Ten projects', descLt: 'Gauk ★★★ 10-yje skirtingų miestų', descEn: 'Earn ★★★ in 10 different cities' },
  { id: 'starsall', reward: 3000, lt: 'Visa Europa ★★★', en: 'All of Europe ★★★', descLt: 'Gauk ★★★ visuose 18 miestų', descEn: 'Earn ★★★ in all 18 cities' },
  { id: 'runs100', reward: 1000, lt: 'Šimtukas', en: 'Century', descLt: 'Sužaisk 100 bėgimų', descEn: 'Play 100 runs' },
  { id: 'daily7', reward: 500, lt: 'Iššūkių savaitė', en: 'Challenge week', descLt: 'Sužaisk 7 dienos iššūkius', descEn: 'Play 7 daily challenges' },
  // workshop
  { id: 'shopper', reward: 50, lt: 'Pirmas pirkinys', en: 'First purchase', descLt: 'Nusipirk pirmą įrangą Dirbtuvėse', descEn: 'Buy your first gear in the Workshop' },
  { id: 'maxed', reward: 300, lt: 'Pilnas komplektas', en: 'Fully kitted', descLt: 'Patobulink bet kurią įrangą iki maksimumo', descEn: 'Max out any piece of gear' },
  { id: 'stylist', reward: 150, lt: 'Stiliaus ikona', en: 'Style icon', descLt: 'Turėk 4 aprangas', descEn: 'Own 4 outfits' },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------
export const NAME_MIN = 2;
export const NAME_MAX = 20;
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u;

export function normalizeName(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if ([...name].length < NAME_MIN || [...name].length > NAME_MAX) return null;
  if (!NAME_RE.test(name)) return null;
  return name;
}

export function nameKey(name) {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
