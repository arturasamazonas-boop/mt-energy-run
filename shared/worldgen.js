// Deterministic course generator. The same (seed, cityIndex) always produces the
// same obstacles and pickups, so the server can re-create a run for validation and
// everybody gets the identical course in the daily challenge.

import { createRng } from './rng.js';
import { CITIES, cityLength, cityStart, speedAt, PHYSICS } from './config.js';

// Obstacle dimensions in meters. y0/y1 = vertical collision band (bottom/top).
export const DIM = {
  cone: { w: 0.62, h: 0.78 },
  barrier: { w: 1.35, h: 1.05 },
  drum: { w: 1.15, h: 1.15 },
  rollDrum: { w: 1.15, h: 1.15 },
  cable: { w: 1.6, h: 0.42 },
  crate: { w: 1.5, h: 1.25 },
  stack: { w: 1.25, h: 2.75 },
  container: { w: 7.2, h: 2.6 },
  scaffold: { h: 2.3, t: 0.28 },
  beam: { w: 1.7, y0: 1.08 },
  rack: { y0: 1.08 },
  birds: { w: 1.7, y0: 1.22, y1: 2.05 },
  // surprises: a load hanging from a crane that drops when you come close, and a
  // drone that cruises high (looks slidable) and dives low just before you reach it
  dropLoad: { w: 1.5, h: 1.25 },
  quad: { w: 1.1, h: 0.55 },
};

const LANDABLE = new Set(['crate', 'container', 'stack', 'barrier', 'drum']);

// Jump arc helpers -----------------------------------------------------------
const G = PHYSICS.gravity;
const VJ = PHYSICS.jumpVelocity;
const AIR = (2 * VJ) / G;

/**
 * A pattern is a function (ctx) that pushes entities relative to ctx.x using
 * time offsets (seconds at the nominal speed), and returns its length in seconds.
 */
function makeCtx(list, x0, v, rng) {
  const X = (t) => x0 + t * v;
  const ctx = {
    v,
    rng,
    X,
    ob(k, t, extra = {}) {
      const d = DIM[k] || {};
      const e = { k, x: X(t), w: extra.w ?? d.w, y0: extra.y0 ?? d.y0 ?? 0, ...extra };
      if (e.y1 === undefined) e.y1 = d.y1 ?? (d.h !== undefined ? e.y0 + d.h : Infinity);
      e.landable = extra.landable ?? LANDABLE.has(k);
      list.push(e);
      return e;
    },
    pit(t, w) {
      list.push({ k: 'pit', x: X(t), w });
    },
    bolt(x, y) {
      list.push({ k: 'bolt', x, y });
    },
    // bolts following a jump started at time t (absolute x of take-off)
    jumpArc(t, n = 5, base = 0, dbl = false) {
      const x = X(t);
      const air = dbl ? AIR * 1.55 : AIR;
      for (let i = 0; i < n; i++) {
        const tau = ((i + 0.5) / n) * air;
        let y;
        if (!dbl) y = VJ * tau - (G * tau * tau) / 2;
        else {
          // rough envelope of a double jump
          const s = tau / air;
          y = 4 * 3.9 * s * (1 - s);
        }
        ctx.bolt(x + tau * v, base + 0.85 + Math.max(0, y));
      }
    },
    line(t0, t1, y, n) {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? t0 : t0 + ((t1 - t0) * i) / (n - 1);
        ctx.bolt(X(t), y);
      }
    },
    lineX(x0, x1, y, n) {
      for (let i = 0; i < n; i++) ctx.bolt(n === 1 ? x0 : x0 + ((x1 - x0) * i) / (n - 1), y);
    },
  };
  return ctx;
}

// Pattern library -----------------------------------------------------------
// tier: minimum difficulty tier. w: base weight. port: weight multiplier in port cities.
const LEAD = 0.32; // seconds between take-off and the obstacle's leading edge
const PATTERNS = [
  { id: 'cone', tier: 0, w: 3, f: (c) => { c.ob('cone', 0.6); c.jumpArc(0.6 - LEAD); return 1.1; } },
  { id: 'barrier', tier: 0, w: 3, f: (c) => { c.ob('barrier', 0.6); c.jumpArc(0.6 - LEAD); return 1.1; } },
  { id: 'drum', tier: 0, w: 2.5, f: (c) => { c.ob('drum', 0.6); c.jumpArc(0.6 - LEAD); return 1.1; } },
  { id: 'cable', tier: 0, w: 1.5, f: (c) => { c.ob('cable', 0.6); c.jumpArc(0.6 - LEAD, 4); return 1.1; } },
  { id: 'beam', tier: 0, w: 3, f: (c) => { c.ob('beam', 0.65); c.line(0.45, 0.95, 0.45, 4); return 1.15; } },
  {
    id: 'pit', tier: 0, w: 2.5, f: (c) => {
      const w = clamp(c.v * 0.27, 2.6, 4.4);
      c.pit(0.6, w);
      c.jumpArc(0.6 - 0.18);
      return 0.6 + w / c.v + 0.5;
    },
  },
  { id: 'bolts', tier: 0, w: 1.6, f: (c) => { c.line(0.2, 1.2, 0.55, 7); return 1.4; } },
  {
    id: 'crate', tier: 0, w: 2, f: (c) => {
      const o = c.ob('crate', 0.6);
      c.jumpArc(0.6 - LEAD, 4);
      c.lineX(o.x + 0.3, o.x + o.w - 0.2, o.y1 + 0.6, 2);
      return 1.25;
    },
  },
  { id: 'cone2', tier: 0, w: 2, f: (c) => { c.ob('cone', 0.5); c.jumpArc(0.5 - LEAD, 4); c.ob('cone', 1.45); c.jumpArc(1.45 - LEAD, 4); return 1.95; } },
  // tier 1
  { id: 'jumpSlide', tier: 1, w: 3, f: (c) => { c.ob('barrier', 0.45); c.jumpArc(0.45 - LEAD, 4); c.ob('beam', 1.4); c.line(1.25, 1.65, 0.45, 3); return 1.9; } },
  { id: 'slideJump', tier: 1, w: 3, f: (c) => { c.ob('beam', 0.45); c.line(0.3, 0.6, 0.45, 2); c.ob('drum', 1.25); c.jumpArc(1.25 - LEAD, 4); return 1.75; } },
  {
    id: 'container', tier: 1, w: 2.4, port: 2.5, f: (c) => {
      const crate = c.ob('crate', 0.55);
      const cont = c.ob('container', 0, { x: crate.x + crate.w });
      c.jumpArc(0.55 - LEAD, 3);
      c.lineX(cont.x + 0.6, cont.x + cont.w - 0.6, cont.y1 + 0.75, 6);
      return (cont.x + cont.w - c.X(0)) / c.v + 0.45;
    },
  },
  { id: 'roll', tier: 1, w: 2, f: (c) => { c.ob('rollDrum', 1.0, { move: -3.2 }); c.line(0.2, 0.55, 0.55, 3); return 1.45; } },
  {
    id: 'rack', tier: 1, w: 2.2, f: (c) => {
      const w = clamp(c.v * 0.55, 5, 11);
      c.ob('rack', 0.55, { w });
      c.lineX(c.X(0.55) + 0.4, c.X(0.55) + w - 0.4, 0.45, Math.round(w / 1.4));
      return 0.55 + w / c.v + 0.45;
    },
  },
  {
    id: 'pitCone', tier: 1, w: 2, f: (c) => {
      const w = clamp(c.v * 0.25, 2.6, 4.2);
      c.pit(0.45, w);
      c.jumpArc(0.45 - 0.18, 4);
      const t2 = 0.45 + w / c.v + 0.72;
      c.ob('cone', t2);
      c.jumpArc(t2 - LEAD, 4);
      return t2 + 0.55;
    },
  },
  { id: 'drum2', tier: 1, w: 2, f: (c) => { c.ob('drum', 0.45); c.jumpArc(0.45 - LEAD, 4); c.ob('drum', 1.32); c.jumpArc(1.32 - LEAD, 4); return 1.8; } },
  // tier 2
  { id: 'stack', tier: 2, w: 2.4, f: (c) => { c.ob('stack', 0.7); c.jumpArc(0.7 - 0.42, 7, 0, true); return 1.35; } },
  {
    id: 'dropLoad', tier: 1, w: 2.6, f: (c) => {
      // hangs 5.5 m up and lets go late (0.85-1.0 s before the hero): it lands just in time
      c.ob('dropLoad', 0.9, { y0: 5.5, top0: 5.5, h: DIM.dropLoad.h, drop: c.rng.range(0.85, 1.0) * c.v, landable: true });
      c.jumpArc(0.9 - LEAD, 4);
      return 1.45;
    },
  },
  {
    id: 'dropPair', tier: 2, w: 2.2, f: (c) => {
      // two loads in quick succession: two separate jumps
      for (const t of [0.9, 1.5]) {
        c.ob('dropLoad', t, { y0: 5.5, top0: 5.5, h: DIM.dropLoad.h, drop: c.rng.range(0.85, 1.0) * c.v, landable: true });
        c.jumpArc(t - LEAD, 3);
      }
      return 2.05;
    },
  },
  {
    id: 'dropTall', tier: 3, w: 1.8, f: (c) => {
      // a double-height load: only a double jump clears it
      c.ob('dropLoad', 0.9, { y0: 5.5, top0: 5.5, h: 2.5, drop: c.rng.range(0.9, 1.0) * c.v, landable: true });
      c.jumpArc(0.9 - 0.42, 7, 0, true);
      return 1.75;
    },
  },
  {
    id: 'quad', tier: 2, w: 2.8, f: (c) => {
      // flies in, hovers where you can see it (keeping pace with the hero) for 1.4 s,
      // blinks, then dives to knee height and waits: jump it
      const hover = Math.min(0.8 * c.v + 3, 23);
      c.ob('quad', 1.0, { y0: 2.1, baseY0: 2.1, h: DIM.quad.h, hover, hoverT: 1.4, diveY0: 0.25 });
      // the dive happens about 1.4 s later than its starting place suggests
      c.jumpArc(1.0 + 1.4 - LEAD, 4);
      return 1.0 + 1.4 + 0.9;
    },
  },
  { id: 'birds', tier: 2, w: 2, f: (c) => { c.ob('birds', 1.0, { move: -2.6 }); c.line(0.55, 1.05, 0.45, 3); return 1.45; } },
  {
    id: 'scaffold', tier: 2, w: 2, f: (c) => {
      const w = clamp(c.v * 0.85, 8, 16);
      const x = c.X(0.6);
      c.ob('scaffold', 0, { x, w, y0: DIM.scaffold.h - DIM.scaffold.t, y1: DIM.scaffold.h, oneWay: true, landable: true });
      c.jumpArc(0.6 - LEAD - 0.05, 3);
      c.lineX(x + 0.8, x + w - 0.6, DIM.scaffold.h + 0.75, Math.round(w / 1.6));
      // cones underneath: either stay on top or hop them
      c.ob('cone', 0, { x: x + w * 0.35 });
      c.ob('cone', 0, { x: x + w * 0.78 });
      return 0.6 + w / c.v + 0.5;
    },
  },
  {
    id: 'longPit', tier: 2, w: 1.6, f: (c) => {
      const w = clamp(c.v * 0.4, 3.6, 7.6);
      c.pit(0.5, w);
      c.jumpArc(0.5 - 0.12, 6, 0, w > 5.2);
      return 0.5 + w / c.v + 0.5;
    },
  },
  {
    id: 'triple', tier: 2, w: 2, f: (c) => {
      c.ob('cone', 0.35); c.jumpArc(0.35 - LEAD, 4);
      c.ob('beam', 1.2); c.line(1.05, 1.4, 0.45, 2);
      c.ob('barrier', 2.0); c.jumpArc(2.0 - LEAD, 4);
      return 2.5;
    },
  },
  {
    id: 'containerBeam', tier: 2, w: 1.6, port: 2.2, f: (c) => {
      const off = Math.max(4.4, c.v * 0.8);
      const crate = c.ob('crate', 0.5);
      const cont = c.ob('container', 0, { x: crate.x + crate.w, w: off + 6 });
      c.ob('beam', 0, { x: cont.x + off, y0: cont.y1 + 1.08 });
      c.jumpArc(0.5 - LEAD, 3);
      c.lineX(cont.x + 0.7, cont.x + off - 0.8, cont.y1 + 0.75, Math.max(3, Math.round(off / 1.6)));
      c.lineX(cont.x + off + 0.2, cont.x + off + 1.4, cont.y1 + 0.45, 2);
      return (cont.x + cont.w - c.X(0)) / c.v + 0.45;
    },
  },
  // tier 3
  {
    id: 'pitCratePit', tier: 3, w: 2, f: (c) => {
      const w = clamp(c.v * 0.24, 2.8, 4.6);
      c.pit(0.35, w);
      c.jumpArc(0.35 - 0.16, 4);
      const t2 = 0.35 + w / c.v + 0.75;
      c.ob('crate', t2);
      c.jumpArc(t2 - LEAD, 4);
      const t3 = t2 + 0.95;
      c.pit(t3, w);
      c.jumpArc(t3 - 0.16, 4);
      return t3 + w / c.v + 0.45;
    },
  },
  { id: 'stackBirds', tier: 3, w: 2, f: (c) => { c.ob('stack', 0.45); c.jumpArc(0.45 - 0.42, 7, 0, true); c.ob('birds', 1.75, { move: -2.6 }); return 2.25; } },
  {
    id: 'drum3', tier: 3, w: 2, f: (c) => {
      for (let i = 0; i < 3; i++) { c.ob('drum', 0.4 + i * 0.82); c.jumpArc(0.4 + i * 0.82 - LEAD, 4); }
      return 2.45;
    },
  },
  {
    id: 'longRack', tier: 3, w: 1.8, f: (c) => {
      const w = clamp(c.v * 0.95, 9, 20);
      c.ob('rack', 0.5, { w });
      c.lineX(c.X(0.5) + 0.5, c.X(0.5) + w - 0.5, 0.45, Math.round(w / 1.5));
      return 0.5 + w / c.v + 0.4;
    },
  },
  { id: 'rollBeam', tier: 3, w: 1.6, f: (c) => { c.ob('rollDrum', 1.0, { move: -3.2 }); c.ob('beam', 1.95); c.line(1.8, 2.1, 0.45, 2); return 2.4; } },
  // tier 4: procedural gauntlet
  {
    id: 'gauntlet', tier: 4, w: 3, f: (c) => {
      let t = 0.35;
      let last = 'none';
      for (let i = 0; i < 4; i++) {
        const k = c.rng.pick(['cone', 'barrier', 'drum', 'beam', 'cable', 'beam']);
        if (k === 'beam') {
          c.ob('beam', t); c.line(t - 0.12, t + 0.15, 0.45, 2);
        } else {
          c.ob(k, t); c.jumpArc(t - LEAD, 3);
        }
        const gap = k === 'beam' || last === 'beam' ? 0.74 : 0.8;
        last = k;
        t += gap;
      }
      return t + 0.15;
    },
  },
];

export const PATTERN_IDS = PATTERNS.map((p) => p.id);

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function tierAt(distance) {
  if (distance < 650) return 0;
  if (distance < 1500) return 1;
  if (distance < 2800) return 2;
  if (distance < 4800) return 3;
  return 4;
}

function restGap(tier, rng) {
  const base = [0.95, 0.8, 0.68, 0.58, 0.5][tier];
  return base + rng.range(0, 0.35);
}

const POWER_WEIGHTS = [
  ['magnet', 28],
  ['helmet', 22],
  ['double', 20],
  ['drone', 15],
  ['excavator', 15],
];

const ENTRY_CLEAR = 30; // meters of calm road after the city sign
const GATE_ZONE = 75; // meters reserved for the project gate

/** Generate all entities for one city. Pure function of (seed, index). */
export function generateCity(seed, index) {
  const rng = createRng(`${seed}|city|${index}`);
  const city = CITIES[index % CITIES.length];
  const start = cityStart(index);
  const len = cityLength(index);
  const end = start + len;
  const list = [];

  let x = start + (index === 0 ? 45 : ENTRY_CLEAR);
  let prev = '';
  let guard = 0;
  while (x < end - GATE_ZONE - 15 && guard++ < 500) {
    const tier = tierAt(x);
    const options = PATTERNS.filter((p) => p.tier <= tier && p.id !== prev).map((p) => {
      let w = p.w;
      if (city.theme === 'port' && p.port) w *= p.port;
      if (p.tier < tier - 1) w *= 0.45; // older patterns become rarer
      return [p, w];
    });
    const pat = rng.weighted(options);
    const v = speedAt(x);
    const sub = [];
    const ctx = makeCtx(sub, x, v, rng);
    const lenT = pat.f(ctx);
    const patEnd = x + lenT * v;
    if (patEnd > end - GATE_ZONE) break;
    for (const e of sub) list.push(e);
    prev = pat.id;
    x = patEnd + restGap(tier, rng) * v;
  }

  // Calm bolt trail toward the gate
  const gx = end - GATE_ZONE * 0.5;
  for (let i = 0; i < 6; i++) list.push({ k: 'bolt', x: gx - 30 + i * 2.2, y: 0.6 });
  list.push({ k: 'gate', x: gx, w: 6 });

  // Replace bolts with special pickups at target positions.
  const bolts = () => list.filter((e) => e.k === 'bolt' && e.x < gx - 40);
  const takeNear = (targetX, prefer) => {
    let best = null;
    let bestScore = Infinity;
    for (const b of bolts()) {
      const s = Math.abs(b.x - targetX) - (prefer === 'high' ? b.y * 6 : 0);
      if (s < bestScore) {
        bestScore = s;
        best = b;
      }
    }
    return best;
  };

  [0.22, 0.55, 0.86].forEach((f, i) => {
    const b = takeNear(start + len * f, 'high');
    if (b) {
      b.k = 'part';
      b.part = i;
    }
  });

  for (const w of city.waypoints || []) list.push({ k: 'checkpoint', x: start + w.from + 6, w: 1, wp: w.id });

  const powers = Math.max(1, Math.round(len / 330));
  for (let i = 0; i < powers; i++) {
    const f = (i + 0.5) / powers + rng.range(-0.08, 0.08);
    const b = takeNear(start + len * f);
    if (b) {
      b.k = 'power';
      b.kind = index === 0 && i === 0 ? 'helmet' : rng.weighted(POWER_WEIGHTS);
    }
  }

  if (rng.chance(0.65)) {
    const b = takeNear(start + len * rng.range(0.3, 0.8), 'high');
    if (b) b.k = 'token';
  }

  list.sort((a, b) => a.x - b.x);
  list.forEach((e, i) => (e.id = `${index}:${i}`));
  return { index, start, end, len, gateX: gx, entities: list };
}

/** Count what was obtainable up to `distance` (used by server validation). */
export function countAvailable(seed, distance, slack = 10) {
  const out = { bolts: 0, parts: 0, tasks: 0, tokens: 0, powers: 0, gates: 0 };
  for (let i = 0; i < 10000; i++) {
    const c = generateCity(seed, i);
    if (c.start > distance + slack) break;
    for (const e of c.entities) {
      if (e.x > distance + slack) break;
      if (e.k === 'bolt') out.bolts++;
      else if (e.k === 'part') out.parts++;
      else if (e.k === 'task') out.tasks++;
      else if (e.k === 'token') out.tokens++;
      else if (e.k === 'power') out.powers++;
      else if (e.k === 'gate') out.gates++;
    }
  }
  return out;
}
