// Cable tunnel: a Temple-Run style stretch. The hero runs away from the camera
// down a three-lane utility tunnel: switch lanes, jump, slide and turn at
// corners. Distance (sim.x) keeps counting, so score and cities carry on.
// Local units: z = meters into the tunnel, lane centres at -1/0/1 × TUNNEL.lane.

import { PHYSICS, speedAt } from './config.js';
import { createRng } from './rng.js';

export const TUNNEL = {
  lane: 1.7, // meters between lane centres
  width: 5.8, // wall to wall
  height: 4.2,
  duration: 24, // seconds inside
  firstAt: 150, // meters after the start of the run (test build: early and often)
  every: 1100, // meters of open road between tunnels
  laneSpeed: 10, // lanes per second
  slideTime: 0.8,
  turnWindow: 0.95, // seconds before a corner in which the turn can be called
};

const HERO_HALF = 0.38; // half width (m)
const LANE_HALF = 0.78; // half width of a lane-sized obstacle
export const TOBS = {
  barrier: { h: 1.0, d: 0.5 }, // low: jump or change lane
  beam: { y0: 1.05, d: 0.45 }, // overhead across all lanes: slide
  wall: { h: 3.2, d: 1.2 }, // full height: change lane
  gap: { d: 3.0 }, // trench across all lanes: jump
};

/** Length (m) of the tunnel that starts at run distance x0. */
export function tunnelLength(x0) {
  return Math.round(TUNNEL.duration * speedAt(x0 + 0.5 * TUNNEL.duration * speedAt(x0)));
}

/**
 * Build tunnel #i that starts at run distance x0.
 * Returns { i, x0, len, obs: [{ z, kind, lanes? }], bolts: [{ z, lane, y }], corners: [{ z, dir }] }.
 */
export function generateTunnel(seed, i, x0) {
  const rng = createRng(`${seed}:tunnel:${i}`);
  const len = tunnelLength(x0);
  const obs = [];
  const bolts = [];
  const corners = [];
  const vAt = (z) => speedAt(x0 + z);
  let z = vAt(0) * 1.6; // a calm first moment to get your bearings
  let nextCorner = z + vAt(z) * rng.range(3.5, 5);
  const endZ = len - vAt(len) * 2.2;
  const line = (from, to, lane) => {
    for (let bz = from; bz < to; bz += 2.4) bolts.push({ z: bz, lane, y: 0.9, alive: true });
  };
  const free = () => rng.int(-1, 1);
  let firstPattern = true;
  while (z < endZ) {
    const v = vAt(z);
    const progress = z / len;
    if (z >= nextCorner && !firstPattern) {
      corners.push({ z, dir: rng.chance(0.5) ? -1 : 1 });
      line(z + v * 0.35, z + v * 1.0, 0);
      z += v * rng.range(1.25, 1.5);
      nextCorner = z + v * rng.range(4, 6);
      continue;
    }
    firstPattern = false;
    const kind = rng.weighted([
      ['walls', 3],
      ['barrier', 2],
      ['barrierAll', 1.6],
      ['beam', 1.8],
      ['gap', 1.4],
      ['wallBarrier', progress > 0.3 ? 1.6 : 0],
      ['wallBeam', progress > 0.45 ? 1.2 : 0],
    ]);
    let open = free();
    switch (kind) {
      case 'walls':
        obs.push({ z, kind: 'wall', lanes: [-1, 0, 1].filter((l) => l !== open) });
        break;
      case 'barrier': {
        const n = rng.chance(0.5) ? 1 : 2;
        const lanes = [-1, 0, 1].filter((l) => l !== open).slice(0, n);
        obs.push({ z, kind: 'barrier', lanes });
        break;
      }
      case 'barrierAll':
        obs.push({ z, kind: 'barrier', lanes: [-1, 0, 1] });
        break;
      case 'beam':
        obs.push({ z, kind: 'beam', lanes: [-1, 0, 1] });
        break;
      case 'gap':
        obs.push({ z, kind: 'gap', lanes: [-1, 0, 1] });
        break;
      case 'wallBarrier':
        // the only way through: change lane and jump
        obs.push({ z, kind: 'wall', lanes: [-1, 0, 1].filter((l) => l !== open) });
        obs.push({ z, kind: 'barrier', lanes: [open] });
        break;
      case 'wallBeam':
        // change lane and slide
        obs.push({ z, kind: 'wall', lanes: [-1, 0, 1].filter((l) => l !== open) });
        obs.push({ z, kind: 'beam', lanes: [open] });
        break;
    }
    const gapT = rng.range(1.05, 1.45) - 0.15 * progress;
    // energy along the way, in a lane that is clear until the next pattern
    if (rng.chance(0.75)) line(z + v * 0.45, z + v * (gapT - 0.3), rng.chance(0.6) ? open : free());
    z += v * gapT;
  }
  for (const o of obs) o.alive = true;
  obs.sort((a, b) => a.z - b.z);
  bolts.sort((a, b) => a.z - b.z);
  return { i, x0, len, obs, bolts, corners };
}

/** Fresh per-run tunnel state for the sim. */
export function enterTunnel(def) {
  return {
    def,
    z: 0,
    lane: 0,
    lx: 0, // smooth lane position (lane units)
    y: 0,
    vy: 0,
    onGround: true,
    slideT: 0, // slide time left
    buffer: 0,
    slideWas: false,
    turnT: -9, // sim time of the last corner taken (for the camera swing)
    turnDir: 0,
    nextCorner: 0, // index into def.corners
  };
}

export function heroHeight(tn) {
  return tn.slideT > 0 ? PHYSICS.slideHeight : PHYSICS.playerHeight;
}

/** The corner the hero is heading for, if any. */
export function pendingCorner(tn) {
  return tn.def.corners[tn.nextCorner] || null;
}

/** Is the hero inside the window where a swipe means "turn"? */
export function inTurnWindow(tn, v) {
  const c = pendingCorner(tn);
  return !!c && c.z - tn.z < v * TUNNEL.turnWindow && c.z - tn.z > -0.5;
}

/**
 * One tunnel step. `sim` supplies helpers (collect energy, hit, die, emit).
 * input: { jump, slide (held), slideTap, left, right }
 * Returns 'out' when the hero reaches the exit.
 */
export function stepTunnel(sim, tn, dt, input, v) {
  const P = PHYSICS;
  tn.z += v * dt;

  // ---- steering and corners --------------------------------------------------
  for (const dir of [input.left ? -1 : 0, input.right ? 1 : 0]) {
    if (!dir) continue;
    const c = pendingCorner(tn);
    if (c && inTurnWindow(tn, v) && dir === c.dir && !c.ok) {
      c.ok = true;
      sim.emit('tunnelTurnReady', { dir });
    } else if (tn.lane + dir >= -1 && tn.lane + dir <= 1) {
      tn.lane += dir;
      sim.emit('tunnelLane', { dir });
    }
  }
  const step = TUNNEL.laneSpeed * dt;
  tn.lx += Math.max(-step, Math.min(step, tn.lane - tn.lx));
  const c = pendingCorner(tn);
  if (c && tn.z >= c.z) {
    if (c.ok || sim.invuln > 0 || sim.shieldT > 0) {
      tn.nextCorner++;
      tn.turnT = sim.time;
      tn.turnDir = c.dir;
      tn.lane = 0;
      tn.lx = 0;
      sim.emit('tunnelTurn', { dir: c.dir });
    } else {
      sim.die('crash', { k: 'tunnelWall' });
      return null;
    }
  }

  // ---- jump / slide --------------------------------------------------------------
  if (input.jump) tn.buffer = P.jumpBuffer;
  else tn.buffer = Math.max(0, tn.buffer - dt);
  if (tn.buffer > 0 && tn.onGround) {
    tn.vy = P.jumpVelocity;
    tn.onGround = false;
    tn.buffer = 0;
    tn.slideT = 0;
    sim.stats.jumps++;
    sim.emit('jump');
  }
  const slidePress = input.slideTap || (input.slide && !tn.slideWas);
  tn.slideWas = !!input.slide;
  if (slidePress) {
    if (tn.onGround) {
      if (tn.slideT <= 0) {
        sim.stats.slides++;
        sim.emit('slide');
      }
      tn.slideT = TUNNEL.slideTime;
    } else {
      tn.vy = Math.min(tn.vy, P.fastFallVelocity);
      tn.slideQueued = true;
      sim.emit('dive');
    }
  }
  if (tn.slideT > 0) {
    // keep sliding while the button is held
    tn.slideT = input.slide ? Math.max(tn.slideT - dt, 0.12) : Math.max(0, tn.slideT - dt);
  }
  if (!tn.onGround) {
    tn.vy -= P.gravity * dt;
    tn.y += tn.vy * dt;
    if (tn.y <= 0 && tn.vy <= 0) {
      tn.y = 0;
      tn.vy = 0;
      tn.onGround = true;
      sim.emit('land', { impact: 10, y: 0 });
      if (tn.slideQueued) {
        tn.slideQueued = false;
        tn.slideT = TUNNEL.slideTime;
        sim.stats.slides++;
        sim.emit('slide');
      }
    }
  }

  // ---- collisions ----------------------------------------------------------------
  const hx = tn.lx * TUNNEL.lane;
  const h = heroHeight(tn);
  for (const o of tn.def.obs) {
    if (!o.alive) continue;
    const d = TOBS[o.kind].d;
    if (o.z + d < tn.z - 0.3) continue;
    if (o.z > tn.z + 0.3) break;
    if (o.kind === 'gap') {
      // over the trench with nothing under your feet
      if (tn.y <= 0.02 && tn.z > o.z + 0.35 && tn.z < o.z + d - 0.35) {
        if (sim.invuln > 0 || sim.shieldT > 0) continue;
        sim.die('fall', { k: 'tunnelGap' });
        return null;
      }
      continue;
    }
    const inLane = o.lanes.some((l) => Math.abs(hx - l * TUNNEL.lane) < HERO_HALF + LANE_HALF);
    if (!inLane) continue;
    let hit = false;
    if (o.kind === 'barrier') hit = tn.y < TOBS.barrier.h - 0.05;
    else if (o.kind === 'beam') hit = tn.y + h > TOBS.beam.y0 + 0.02;
    else hit = tn.y < TOBS.wall.h;
    if (hit) {
      sim.tunnelHit(o);
      if (sim.dead) return null;
    }
  }

  // ---- energy ----------------------------------------------------------------------
  for (const b of tn.def.bolts) {
    if (!b.alive) continue;
    if (b.z < tn.z - 1) continue;
    if (b.z > tn.z + 1.2) break;
    const near = sim.power.magnet > 0 || (Math.abs(hx - b.lane * TUNNEL.lane) < 0.9 && Math.abs(tn.y + h * 0.5 - b.y) < 1.2);
    if (near) {
      b.alive = false;
      sim.collectTunnelBolt(b);
    }
  }

  return tn.z >= tn.def.len ? 'out' : null;
}

/** Simple look-ahead autopilot for tunnels (demo, debug autoplay and tests). */
export function tunnelBotInput(sim) {
  const tn = sim.tunnel;
  const v = speedAt(sim.x);
  const inp = {};
  const c = pendingCorner(tn);
  if (c && !c.ok && inTurnWindow(tn, v) && c.z - tn.z < v * 0.6) {
    if (c.dir < 0) inp.left = true;
    else inp.right = true;
    return inp;
  }
  const ahead = tn.def.obs.filter((o) => o.alive && o.z + TOBS[o.kind].d > tn.z - 0.2 && o.z < tn.z + v * 1.0);
  const COST = { wall: 100, barrier: 3, beam: 2, gap: 0 };
  // deal with the nearest row of obstacles first; the next one only breaks ties
  const rows = [...new Set(ahead.map((o) => o.z))].sort((a, b) => a - b);
  const rowCost = (z, l) => ahead.reduce((c, o) => c + (o.z === z && o.lanes.includes(l) ? COST[o.kind] : 0), 0);
  const score = (l) => Math.abs(l - tn.lane) * 0.5 + (rows.length ? rowCost(rows[0], l) : 0) + (rows.length > 1 ? rowCost(rows[1], l) * 0.1 : 0);
  // too close to the nearest row to change lanes safely: stay unless walled in
  const imminent = rows.length && rows[0] - tn.z < v * 0.2 && rowCost(rows[0], tn.lane) < COST.wall;
  let best = tn.lane;
  if (!imminent) for (const l of [-1, 0, 1]) if (score(l) < score(best)) best = l;
  if (best < tn.lane) inp.left = true;
  else if (best > tn.lane) inp.right = true;
  const lane = best;
  for (const o of ahead) {
    const dz = o.z - tn.z;
    if (o.kind !== 'gap' && !o.lanes.includes(lane)) continue;
    if ((o.kind === 'barrier' && dz < v * 0.12 + 0.5 && dz > -0.2) || (o.kind === 'gap' && dz < v * 0.06 + 0.3 && dz > -0.3)) inp.jump = true;
    if (o.kind === 'beam' && dz < v * 0.3 && dz > -0.3) inp.slide = true;
  }
  return inp;
}
