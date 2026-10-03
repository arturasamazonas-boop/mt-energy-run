// Server-side game rules: run validation, progression, shop.
import {
  SCORE, UPGRADES, UPGRADE_BY_ID, COSMETIC_BY_ID, ACHIEVEMENTS, ACHIEVEMENT_BY_ID,
  minTimeFor, cityAt,
} from '../shared/config.js';
import { countAvailable } from '../shared/worldgen.js';
import { computeEnergy } from '../shared/sim.js';

const INT_FIELDS = ['distance', 'score', 'bolts', 'parts', 'tokens', 'tasks', 'tasksFailed', 'gates', 'stars', 'perfectCities', 'maxMult', 'cityIndex', 'powerups', 'smashed'];

export function emptyPlayerData() {
  return {
    energy: 0,
    upgrades: {},
    cosmetics: { owned: ['suit', 'birthday'], equipped: 'suit' },
    stats: { runs: 0, totalDistance: 0, totalBolts: 0, totalTasks: 0, totalTokens: 0, bestScore: 0, bestDistance: 0, bestCity: 0, dailyRuns: 0 },
    achievements: {},
    cityStars: {},
  };
}

/** Make sure older/partial records have every field. */
export function normalizeData(data) {
  const base = emptyPlayerData();
  const d = { ...base, ...(data || {}) };
  d.upgrades = { ...(data?.upgrades || {}) };
  d.cosmetics = { ...base.cosmetics, ...(data?.cosmetics || {}) };
  d.cosmetics.owned = [...new Set([...(base.cosmetics.owned), ...(data?.cosmetics?.owned || [])])];
  d.stats = { ...base.stats, ...(data?.stats || {}) };
  d.achievements = { ...(data?.achievements || {}) };
  d.cityStars = { ...(data?.cityStars || {}) };
  return d;
}

/**
 * Plausibility checks for a submitted run summary. The course is regenerated
 * from the seed so counts can be bounded exactly.
 */
export function validateRun(run, raw, elapsedSec) {
  const reasons = [];
  const s = {};
  for (const k of INT_FIELDS) {
    const v = Number(raw?.[k] ?? 0);
    if (!Number.isFinite(v) || v < 0 || v > 1e9) reasons.push(`bad_${k}`);
    s[k] = Math.floor(Number.isFinite(v) ? Math.max(0, v) : 0);
  }
  s.revived = !!raw?.revived;
  s.cityStars = [];
  let starSum = 0;
  for (const it of Array.isArray(raw?.cityStars) ? raw.cityStars.slice(0, 500) : []) {
    const ci = Math.floor(Number(it?.[0]));
    const st = Math.floor(Number(it?.[1]));
    if (!Number.isFinite(ci) || !Number.isFinite(st) || ci < 0 || ci > s.cityIndex || st < 0 || st > 3) continue;
    s.cityStars.push([ci, st]);
    starSum += st;
  }
  if (reasons.length) return { ok: false, reasons, summary: s };
  if (starSum > s.stars) reasons.push('city_stars');

  const base = 1 + (run.upgrades?.startMult || 0);
  if (minTimeFor(s.distance) > elapsedSec + 4) reasons.push('too_fast');
  if (s.distance > 200000) reasons.push('too_far');

  const avail = countAvailable(run.seed, s.distance, 12);
  if (s.bolts > avail.bolts) reasons.push('bolts');
  if (s.parts > avail.parts) reasons.push('parts');
  if (s.tokens > avail.tokens) reasons.push('tokens');
  if (s.tasks + s.tasksFailed > avail.tasks) reasons.push('tasks');
  if (s.gates > avail.gates) reasons.push('gates');
  if (s.stars > Math.min(s.parts, s.gates * 3)) reasons.push('stars');
  if (s.perfectCities > s.gates) reasons.push('perfect');
  if (s.maxMult > Math.min(SCORE.maxMult, base + s.tasks + s.perfectCities) || s.maxMult < 1) reasons.push('mult');
  if (s.smashed > s.distance / 2 + 5) reasons.push('smashed');
  if (Math.abs(cityAt(s.distance).index - s.cityIndex) > 1) reasons.push('city');

  const lastCity = Math.max(0, s.cityIndex);
  const bound =
    2 *
    (s.distance * Math.max(1, s.maxMult) +
      s.bolts * SCORE.bolt +
      s.tokens * SCORE.token +
      s.parts * SCORE.part +
      s.tasks * SCORE.taskSuccess +
      s.gates * (SCORE.gateBase + SCORE.gatePerCity * lastCity + SCORE.gatePerStar * 3) +
      s.smashed * 25) + 50;
  if (s.score > bound) reasons.push('score');

  return { ok: reasons.length === 0, reasons, summary: s };
}

/** Apply a valid run to the player's data. Returns rewards info. */
export function applyRun(data, s, run, { birthday = false } = {}) {
  const d = data;
  const st = d.stats;
  st.runs++;
  st.totalDistance += s.distance;
  st.totalBolts += s.bolts;
  st.totalTasks += s.tasks;
  st.totalTokens = (st.totalTokens || 0) + s.tokens;
  if (run.mode === 'daily') st.dailyRuns++;
  const newBest = s.score > st.bestScore;
  if (newBest) st.bestScore = s.score;
  st.bestDistance = Math.max(st.bestDistance, s.distance);
  st.bestCity = Math.max(st.bestCity, s.cityIndex);

  // best stars per city come from the client's per-city report, bounded by totals
  if (Array.isArray(s.cityStars)) {
    for (const [ci, stars] of s.cityStars) {
      const k = String(ci);
      d.cityStars[k] = Math.max(d.cityStars[k] || 0, Math.min(3, stars));
    }
  }

  let energy = computeEnergy(s, run.upgrades || {});
  const unlocked = [];
  const has = (id) => !!d.achievements[id];
  const give = (id) => {
    if (has(id)) return;
    d.achievements[id] = new Date().toISOString();
    unlocked.push(id);
    energy += ACHIEVEMENT_BY_ID[id].reward;
  };
  give('firstrun');
  if (s.distance >= 1000) give('km1');
  if (s.distance >= 3000) give('km3');
  if (s.distance >= 6000) give('km6');
  if (s.cityIndex >= 2) give('riga');
  if (s.cityIndex >= 6) give('copenhagen');
  if (s.cityIndex >= 11) give('paris');
  if (s.cityIndex >= 18) give('grandtour');
  if (s.perfectCities >= 1) give('stars3');
  if (s.tasks >= 5) give('tasks5');
  if (s.maxMult >= 10) give('mult10');
  if (s.score >= 50000) give('score50k');
  if (s.score >= 250000) give('score250k');
  if (st.totalBolts >= 5000) give('bolts5000');
  if (st.runs >= 25) give('runs25');
  if (run.mode === 'daily') give('daily');
  if (birthday) give('birthday');
  if (birthday && s.score >= 2410) give('bdaygift');
  // route (distances are from the start in Vilnius)
  if (s.distance >= 200) give('raseiniai');
  if (s.distance >= 400) give('rietavas');
  if (s.cityIndex >= 1) give('klaipeda');
  if (s.cityIndex >= 3) give('tallinn');
  if (s.cityIndex >= 5) give('stockholm');
  if (s.cityIndex >= 7) give('mtsites');
  if (s.cityIndex >= 10) give('london');
  if (s.cityIndex >= 13) give('rome');
  if (s.cityIndex >= 16) give('berlin');
  if (s.cityIndex >= 19) give('lap2');
  // single run
  if (s.distance >= 10000) give('km10');
  if (s.bolts >= 300) give('bolts300');
  if (s.tokens >= 3) give('tokens3');
  if (s.perfectCities >= 3) give('perfect3');
  if (s.tasks >= 4 && s.tasksFailed === 0) give('nofail');
  if (s.maxMult >= 15) give('mult15');
  if (s.smashed >= 10) give('smash10');
  if (s.powerups >= 8) give('power8');
  if (s.score >= 100000) give('score100k');
  if (s.score >= 500000) give('score500k');
  if (s.revived && s.distance >= 500) give('revive');
  // career
  if (st.totalDistance >= 42195) give('marathon');
  if (st.totalDistance >= 600000) give('km200');
  if (st.totalBolts >= 25000) give('bolts25000');
  if (st.totalTokens >= 25) give('tokens25');
  if (st.totalTasks >= 50) give('tasks50');
  const perfect = Object.values(d.cityStars).filter((v) => v >= 3).length;
  if (perfect >= 10) give('stars10');
  if (perfect >= 18) give('starsall');
  if (st.runs >= 100) give('runs100');
  if (st.dailyRuns >= 7) give('daily7');
  // workshop (also granted at purchase time, see buy())
  for (const id of workshopAchievements(d)) give(id);
  if (has('grandtour') && !d.cosmetics.owned.includes('gold')) d.cosmetics.owned.push('gold');

  d.energy += energy;
  return { energy, unlocked, newBest };
}

/** Workshop achievements the player currently qualifies for. */
function workshopAchievements(d) {
  const out = [];
  const lv = Object.entries(d.upgrades || {});
  if (lv.some(([, n]) => n > 0)) out.push('shopper');
  if (lv.some(([id, n]) => UPGRADE_BY_ID[id] && n >= UPGRADE_BY_ID[id].costs.length)) out.push('maxed');
  if ((d.cosmetics?.owned || []).length >= 4) out.push('stylist');
  return out;
}

/** Grant workshop achievements right after a purchase. Returns unlocked ids. */
export function grantWorkshop(d) {
  const unlocked = [];
  for (const id of workshopAchievements(d)) {
    if (d.achievements[id]) continue;
    d.achievements[id] = new Date().toISOString();
    d.energy += ACHIEVEMENT_BY_ID[id].reward;
    unlocked.push(id);
  }
  return unlocked;
}

/** Combine a guest's progress into an email-protected account (merge consent). */
export function mergeData(src, dst) {
  const a = normalizeData(src);
  const b = normalizeData(dst);
  const out = normalizeData(dst);
  out.energy = a.energy + b.energy;
  for (const [k, v] of Object.entries(a.upgrades)) out.upgrades[k] = Math.max(v, b.upgrades[k] || 0);
  out.cosmetics.owned = [...new Set([...b.cosmetics.owned, ...a.cosmetics.owned])];
  for (const k of ['runs', 'totalDistance', 'totalBolts', 'totalTasks', 'totalTokens', 'dailyRuns']) out.stats[k] = (a.stats[k] || 0) + (b.stats[k] || 0);
  for (const k of ['bestScore', 'bestDistance', 'bestCity']) out.stats[k] = Math.max(a.stats[k] || 0, b.stats[k] || 0);
  for (const [k, v] of Object.entries(a.achievements)) if (!out.achievements[k] || v < out.achievements[k]) out.achievements[k] = v;
  for (const [k, v] of Object.entries(a.cityStars)) out.cityStars[k] = Math.max(v, b.cityStars[k] || 0);
  return out;
}

export function upgradeCost(id, level) {
  const u = UPGRADE_BY_ID[id];
  if (!u || level >= u.costs.length) return null;
  return u.costs[level];
}

export function buy(data, kind, id) {
  const err = (code) => Object.assign(new Error(code), { code });
  if (kind === 'upgrade') {
    if (!UPGRADE_BY_ID[id]) throw err('unknown_item');
    const lvl = data.upgrades[id] || 0;
    const cost = upgradeCost(id, lvl);
    if (cost === null) throw err('maxed');
    if (data.energy < cost) throw err('not_enough');
    data.energy -= cost;
    data.upgrades[id] = lvl + 1;
    return { cost };
  }
  if (kind === 'cosmetic') {
    const c = COSMETIC_BY_ID[id];
    if (!c || c.gift || c.achievement) throw err('unknown_item');
    if (data.cosmetics.owned.includes(id)) throw err('owned');
    if (data.energy < c.cost) throw err('not_enough');
    data.energy -= c.cost;
    data.cosmetics.owned.push(id);
    data.cosmetics.equipped = id;
    return { cost: c.cost };
  }
  throw err('unknown_item');
}

export function equip(data, id) {
  if (!data.cosmetics.owned.includes(id)) throw Object.assign(new Error('not_owned'), { code: 'not_owned' });
  data.cosmetics.equipped = id;
}

export const ACHIEVEMENT_IDS = ACHIEVEMENTS.map((a) => a.id);
export const UPGRADE_IDS = UPGRADES.map((u) => u.id);
