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
  jumpCutFactor: 0.45, // vy multiplier when the jump button is released early
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
    project: { type: 'hydrogen', lt: 'Žaliojo vandenilio jėgainė', en: 'Green hydrogen plant' },
    landmarks: ['gediminas', 'cathedral', 'tvtower'], sky: 'morning',
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

export function cityStart(index) {
  let s = 0;
  for (let i = 0; i < index; i++) s += cityLength(i);
  return s;
}

// ---------------------------------------------------------------------------
// Power-ups
// ---------------------------------------------------------------------------
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
