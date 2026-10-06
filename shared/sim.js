// Headless gameplay simulation: runner physics, collisions, pickups and scoring.
// Used by the browser game, by the test bot and (for counting) by the server.
// Units: meters and seconds. `x` is the distance run (player feet centre).

import { PHYSICS, SCORE, ABILITIES, speedAt, cityAt, cityStart, powerupDuration, boltValue, CITIES } from './config.js';
import { generateCity } from './worldgen.js';

const P = PHYSICS;
const DRONE_Y = 4.6; // altitude the drone starts at
const DRONE_MIN = 1.2; // the player steers between these (jump = up, slide = down)
const DRONE_MAX = 6.5;
const DRONE_CLIMB = 7; // m/s
const DRONE_PULL_R = 3; // the drone only gathers bolts close by, so steering matters
const MAGNET_R = 7.5;

export class Sim {
  constructor({ seed, upgrades = {}, startCity = 0, startAt = null } = {}) {
    this.seed = seed;
    this.upgrades = upgrades;
    this.x = startAt ?? cityStart(startCity);
    if (startAt !== null) startCity = cityAt(startAt).index;
    this.startX = this.x;
    this.y = 0;
    this.vy = 0;
    this.onGround = true;
    this.support = 0;
    this.sliding = false;
    this.slideT = 0;
    this.jumps = 0;
    this.jumpT = 0;
    this.jumpHeld = false;
    this.cut = false;
    this.coyote = 0;
    this.buffer = 0;
    this.slideHeld = false;
    this.time = 0;
    this.dead = false;
    this.deathCause = null;
    this.deathKind = null;
    this.invuln = 0;
    this.revived = false;

    this.mult = 1 + (upgrades.startMult || 0);
    this.baseMult = this.mult;
    this.maxMult = this.mult;
    this.score = 0;
    this.scoreFrac = 0;
    this.lastScoredX = this.x;

    this.helmet = !!upgrades.startHelmet;
    this.power = { magnet: 0, drone: 0, excavator: 0, double: 0 };
    this.charge = { shield: 0, jet: 0 }; // bolts towards each ability
    this.shieldT = 0;
    this.jetT = 0; // jetpack flight left
    this.droneY = 0;
    this.droneTarget = DRONE_Y;

    this.stats = {
      bolts: 0, parts: 0, tokens: 0, tasks: 0, tasksFailed: 0, powerups: 0,
      smashed: 0, helmetsUsed: 0, gates: 0, stars: 0, perfectCities: 0, jumps: 0, slides: 0,
      shields: 0, jets: 0,
    };
    this.partsByCity = {};
    this.gateStars = {};
    this.cityIndex = startCity;
    this.loadedUntil = startCity; // next city index to load
    this.entities = [];
    this.events = [];
    this.pendingTask = null;
    this.ensureLoaded();
  }

  get height() {
    return this.sliding ? P.slideHeight : P.playerHeight;
  }

  get speed() {
    return speedAt(this.x);
  }

  get flying() {
    return this.power.drone > 0;
  }

  ensureLoaded() {
    while (cityStart(this.loadedUntil) < this.x + 140) {
      const c = generateCity(this.seed, this.loadedUntil);
      for (const e of c.entities) {
        e.alive = true;
        e.x0 = e.x;
        this.entities.push(e);
      }
      this.loadedUntil++;
    }
    // prune entities far behind
    if (this.entities.length > 400 || (this.entities[0] && this.entities[0].x < this.x - 40)) {
      this.entities = this.entities.filter((e) => e.x + (e.w || 0) > this.x - 30);
    }
  }

  emit(type, data = {}) {
    this.events.push({ type, t: this.time, ...data });
  }

  addScore(points) {
    const p = points * (this.power.double > 0 ? 2 : 1);
    this.score += p;
    return p;
  }

  setMult(m) {
    const prev = this.mult;
    this.mult = Math.max(this.baseMult, Math.min(SCORE.maxMult, m));
    this.maxMult = Math.max(this.maxMult, this.mult);
    if (this.mult !== prev) this.emit('mult', { mult: this.mult, up: this.mult > prev });
  }

  /** Highest walkable surface under the player (or -Infinity over a pit). */
  supportAt(x, prevY) {
    const half = P.playerWidth / 2 - 0.12;
    let ground = prevY >= -0.06 ? 0 : -Infinity; // once inside a trench you cannot pop back up
    if (ground === 0 && this.overPit(x, half)) ground = -Infinity;
    if (ground === -Infinity && this.power.excavator > 0 && prevY >= -0.06) ground = 0; // tracks bridge pits
    let best = ground;
    for (const e of this.entities) {
      if (!e.alive || !e.landable) continue;
      if (x + half < e.x || x - half > e.x + e.w) continue;
      if (e.y1 <= prevY + 0.06 && e.y1 > best) best = e.y1;
    }
    return best;
  }

  overPit(x, half = P.playerWidth / 2 - 0.12, ahead = 0) {
    for (const e of this.entities) {
      if (e.k !== 'pit' || !e.alive) continue;
      if (x - half >= e.x - ahead && x + half <= e.x + e.w) return true;
    }
    return false;
  }

  overheadBlocked() {
    // Is there something above that would hit a standing player?
    const half = P.playerWidth / 2 - 0.1;
    for (const e of this.entities) {
      if (!e.alive || e.k === 'pit' || e.oneWay) continue;
      if (e.k === 'bolt' || e.k === 'part' || e.k === 'token' || e.k === 'power' || e.k === 'task' || e.k === 'gate' || e.k === 'checkpoint') continue;
      if (this.x + half < e.x || this.x - half > e.x + e.w) continue;
      if (e.y0 > this.y + P.slideHeight - 0.05 && e.y0 < this.y + P.playerHeight) return true;
    }
    return false;
  }

  /**
   * Advance the simulation.
   * input: { jump: bool (pressed since last step), jumpHeld: bool, slide: bool (held) }
   */
  step(dt, input = {}) {
    if (this.dead || this.pendingTask) return;
    this.time += dt;
    const prevY = this.y;
    const v = speedAt(this.x);
    this.x += v * dt;

    for (const k of ['magnet', 'drone', 'excavator', 'double']) {
      if (this.power[k] > 0) {
        this.power[k] = Math.max(0, this.power[k] - dt);
        // never drop the player into a trench when a vehicle power-up expires
        if (this.power[k] === 0 && (k === 'drone' || k === 'excavator') && this.overPit(this.x, 0.5, 14)) this.power[k] = 0.05;
        if (this.power[k] === 0) {
          this.emit('powerEnd', { kind: k });
          if (k === 'drone') {
            this.invuln = Math.max(this.invuln, 1.2);
            this.onGround = false;
            this.jumps = 2;
            this.vy = 0;
          }
        }
      }
    }
    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
    if (this.shieldT > 0) {
      this.shieldT = Math.max(0, this.shieldT - dt);
      if (this.shieldT === 0) this.emit('shieldEnd');
    }
    if (input.shield) this.useAbility('shield');
    if (this.jetT > 0) {
      this.jetT = Math.max(0, this.jetT - dt);
      // like the drone, never let go over a trench
      if (this.jetT === 0 && !this.flying && this.overPit(this.x, 0.5, 14)) this.jetT = 0.05;
      if (this.jetT === 0) {
        this.emit('jetEnd');
        if (!this.flying) {
          this.invuln = Math.max(this.invuln, 1.0);
          this.onGround = false;
          this.jumps = 2;
          this.vy = 0;
        }
      }
    }
    if (input.jet) this.useAbility('jet');

    // ---- input -------------------------------------------------------------
    if (input.jump) this.buffer = P.jumpBuffer;
    else this.buffer = Math.max(0, this.buffer - dt);
    this.jumpHeld = !!input.jumpHeld;
    this.slideHeld = !!input.slide;
    if (!this.onGround) this.coyote = Math.max(0, this.coyote - dt);

    if (this.flying || this.jetT > 0) {
      // Drone power-up or jetpack (both ignore obstacles): hold jump to climb, slide to descend.
      const climb = (input.jumpHeld ? 1 : 0) - (input.slide ? 1 : 0);
      this.droneTarget = Math.max(DRONE_MIN, Math.min(DRONE_MAX, this.droneTarget + climb * DRONE_CLIMB * dt));
      this.droneY += (this.droneTarget - this.droneY) * Math.min(1, dt * 6);
      this.y = this.droneY;
      this.vy = 0;
      this.onGround = false;
      this.sliding = false;
      this.buffer = 0;
    } else {
      if (this.buffer > 0 && (this.onGround || this.coyote > 0)) {
        this.doJump(P.jumpVelocity, 1);
      } else if (input.jump && !this.onGround && this.jumps < 2) {
        this.doJump(P.doubleJumpVelocity, 2);
      }

      // every jump is a full jump: letting go early no longer cuts it short

      // slide / fast fall
      if (this.slideHeld) {
        if (this.onGround) {
          if (!this.sliding) {
            this.sliding = true;
            this.slideT = 0;
            this.stats.slides++;
            this.emit('slide');
          }
        } else if (this.vy > P.fastFallVelocity) {
          if (!this.fastFalling) this.emit('dive');
          this.fastFalling = true;
          this.vy = P.fastFallVelocity;
        }
      }
      if (this.sliding) {
        this.slideT += dt;
        if (!this.slideHeld && this.slideT >= P.minSlide && !this.overheadBlocked()) this.sliding = false;
      }

      // ---- vertical motion -------------------------------------------------
      if (!this.onGround) {
        this.vy -= P.gravity * dt;
        this.y += this.vy * dt;
      }
      const support = this.supportAt(this.x, prevY);
      if (!this.onGround) {
        if (this.vy <= 0 && this.y <= support) {
          this.land(support);
        }
      } else if (support < this.y - 0.02) {
        // walked off an edge
        this.onGround = false;
        this.coyote = P.coyoteTime;
        this.vy = 0;
        this.jumps = 0;
      } else {
        this.y = support;
      }

      if (this.y < -0.35 && !this.overPit(this.x, 0)) {
        // slammed into the far wall of a trench
        this.y = Math.min(this.y, -2.3);
      }
      if (this.y < -2.2) {
        if (this.helmet) {
          // the helmet saves you once: bounce out of the trench
          this.helmet = false;
          this.stats.helmetsUsed++;
          this.y = -1.2;
          this.vy = P.jumpVelocity * 1.25;
          this.jumps = 1;
          this.cut = true;
          this.invuln = 1.2;
          this.setMult(this.mult - 1);
          this.emit('helmetSave', { fall: true });
        } else {
          this.die('fall');
          return;
        }
      }
    }

    // ---- entities ------------------------------------------------------------
    this.ensureLoaded();
    const px0 = this.x - P.playerWidth / 2 + 0.1;
    const px1 = this.x + P.playerWidth / 2 - 0.1;
    const py0 = this.y + 0.05;
    const py1 = this.y + this.height - 0.08;
    const cx = this.x;
    const cy = this.y + this.height * 0.5;

    for (const e of this.entities) {
      if (!e.alive) continue;
      if (e.x > this.x + 60) break;
      switch (e.k) {
        case 'bolt':
        case 'part':
        case 'token':
        case 'power':
        case 'task': {
          let dx = e.x - cx;
          let dy = e.y - cy;
          const pullR = this.power.magnet > 0 ? MAGNET_R : this.flying || this.jetT > 0 ? DRONE_PULL_R : 0;
          // pulled bolts (magnet or drone) keep flying to the hero
          if (e.k === 'bolt' && (e.pulled || (pullR && dx > -3 && dx < pullR && Math.abs(dy) < pullR))) {
            e.pulled = true;
            const d = Math.hypot(dx, dy) || 1;
            const pull = Math.min(d, (v + 18) * dt);
            e.x -= (dx / d) * pull;
            e.y -= (dy / d) * pull;
            dx = e.x - cx;
            dy = e.y - cy;
          }
          const r = e.k === 'bolt' ? 0.85 : 1.0;
          if (Math.abs(dx) < r + 0.25 && Math.abs(dy) < r + this.height * 0.45) this.collect(e);
          break;
        }
        case 'checkpoint':
          if (this.x >= e.x && !e.passed) {
            e.passed = true;
            this.emit('checkpoint', { wp: e.wp, x: e.x });
          }
          break;
        case 'gate':
          if (this.x >= e.x && !e.passed) {
            e.passed = true;
            this.passGate(e);
          }
          break;
        case 'pit':
          break;
        default: {
          // obstacles
          if (e.move && e.x - this.x < 32) e.x += e.move * dt;
          if (e.drop !== undefined && e.y0 > 0) {
            // a hanging load lets go when the hero comes close and falls to the road
            if (!e.falling && e.x - this.x < e.drop) e.falling = true;
            if (e.falling) {
              e.vy = (e.vy || 0) - 30 * dt;
              e.y0 = Math.max(0, e.y0 + e.vy * dt);
              e.y1 = e.y0 + e.h;
              if (e.y0 === 0) this.emit('loadLanded', { x: e.x + e.w / 2 });
            }
          }
          if (e.hover !== undefined && !e.diving) {
            // a drone flies in, hovers in view keeping pace with the hero, then dives
            if (!e.hovering && e.x - this.x < e.hover) {
              e.hovering = true;
              e.hoverLeft = e.hoverT;
            }
            if (e.hovering) {
              e.x += v * dt;
              e.hoverLeft -= dt;
              e.y0 = e.baseY0 + 0.2 * Math.sin(e.hoverLeft * 7);
              e.y1 = e.y0 + e.h;
              if (e.hoverLeft <= 0) e.diving = true;
            }
          }
          if (e.diving && e.y0 > e.diveY0) {
            e.y0 = Math.max(e.diveY0, e.y0 - 6 * dt);
            e.y1 = e.y0 + e.h;
          }
          if (px1 < e.x || px0 > e.x + e.w) continue;
          if (py1 < e.y0 || py0 > e.y1) continue;
          if (e.oneWay) continue;
          // standing on top of it is fine
          if (e.landable && this.y >= e.y1 - 0.08) continue;
          this.hit(e);
          if (this.dead) return;
        }
      }
    }

    // ---- score ---------------------------------------------------------------
    const gained = (this.x - this.lastScoredX) * this.mult;
    this.lastScoredX = this.x;
    this.scoreFrac += gained * (this.power.double > 0 ? 2 : 1);
    if (this.scoreFrac >= 1) {
      const w = Math.floor(this.scoreFrac);
      this.score += w;
      this.scoreFrac -= w;
    }

    const ci = cityAt(this.x).index;
    if (ci !== this.cityIndex) {
      this.cityIndex = ci;
      this.emit('city', { index: ci });
    }
  }

  doJump(vel, n) {
    this.vy = vel;
    this.onGround = false;
    this.coyote = 0;
    this.buffer = 0;
    this.jumps = n;
    this.jumpT = 0;
    this.cut = false;
    this.fastFalling = false;
    if (this.sliding) this.sliding = false;
    this.stats.jumps++;
    this.emit(n === 1 ? 'jump' : 'doubleJump');
  }

  land(support) {
    const impact = -this.vy;
    this.y = support;
    this.vy = 0;
    this.onGround = true;
    this.jumps = 0;
    this.cut = false;
    this.fastFalling = false;
    this.emit('land', { impact, y: support });
    if (this.slideHeld) {
      this.sliding = true;
      this.slideT = 0;
      this.stats.slides++;
      this.emit('slide');
    }
  }

  collect(e) {
    e.alive = false;
    switch (e.k) {
      case 'bolt': {
        this.stats.bolts++;
        const p = this.addScore(SCORE.bolt);
        this.emit('bolt', { x: e.x, y: e.y, points: p });
        // nothing charges while an ability is running
        if (this.shieldT === 0 && this.jetT === 0) this.addCharge();
        break;
      }
      case 'part': {
        this.stats.parts++;
        const ci = cityAt(e.x0 ?? e.x).index;
        this.partsByCity[ci] = (this.partsByCity[ci] || 0) + 1;
        const p = this.addScore(SCORE.part);
        this.emit('part', { x: e.x, y: e.y, part: e.part, city: ci, count: this.partsByCity[ci], points: p });
        break;
      }
      case 'token': {
        this.stats.tokens++;
        const p = this.addScore(SCORE.token);
        this.emit('token', { x: e.x, y: e.y, points: p });
        break;
      }
      case 'power': {
        this.stats.powerups++;
        if (e.kind === 'helmet') {
          this.helmet = true;
        } else {
          this.power[e.kind] = powerupDuration(e.kind, this.upgrades);
          if (e.kind === 'drone') {
            this.droneY = this.y;
            this.droneTarget = DRONE_Y;
            this.sliding = false;
          }
        }
        this.emit('power', { kind: e.kind, x: e.x, y: e.y });
        break;
      }
      case 'task':
        this.pendingTask = { x: e.x, y: e.y };
        this.emit('task', { x: e.x, y: e.y });
        break;
    }
  }

  /** Called by the game layer once the site task mini-game is resolved. */
  resolveTask(success) {
    if (!this.pendingTask) return;
    this.pendingTask = null;
    if (success) {
      this.stats.tasks++;
      const p = this.addScore(SCORE.taskSuccess);
      this.setMult(this.mult + 1);
      this.emit('taskDone', { success: true, points: p });
    } else {
      this.stats.tasksFailed++;
      this.emit('taskDone', { success: false, points: 0 });
    }
    this.invuln = Math.max(this.invuln, 0.9);
  }

  passGate(e) {
    const ci = cityAt(e.x - 1).index;
    const stars = Math.min(3, this.partsByCity[ci] || 0);
    this.stats.gates++;
    this.stats.stars += stars;
    this.gateStars[ci] = stars;
    e.stars = stars;
    const p = this.addScore(SCORE.gateBase + SCORE.gatePerCity * ci + SCORE.gatePerStar * stars);
    if (stars === 3) {
      this.stats.perfectCities++;
      this.setMult(this.mult + 1);
    }
    this.emit('gate', { city: ci, stars, points: p });
  }

  addCharge() {
    for (const k of ['shield', 'jet']) {
      const cost = ABILITIES[k].cost;
      if (this.charge[k] >= cost) continue;
      this.charge[k]++;
      if (this.charge[k] === cost) this.emit('abilityReady', { kind: k });
    }
  }

  /** Trigger an ability if it is fully charged. */
  useAbility(kind) {
    const a = ABILITIES[kind];
    if (!a || this.charge[kind] < a.cost || this.dead) return false;
    if ((kind === 'shield' && this.shieldT > 0) || (kind === 'jet' && this.jetT > 0)) return false;
    this.charge[kind] = 0;
    if (kind === 'shield') {
      this.shieldT = a.duration;
      this.stats.shields++;
    } else {
      this.jetT = a.duration;
      this.stats.jets++;
      if (!this.flying) {
        this.droneY = this.y;
        this.droneTarget = Math.max(this.y, 3.2);
      }
      this.sliding = false;
    }
    this.emit(kind);
    return true;
  }

  hit(e) {
    if (this.flying || this.jetT > 0) return; // drone power-up and jetpack fly through obstacles
    if (this.shieldT > 0) return; // obstacles pass through the energy shield
    if (this.power.excavator > 0) {
      e.alive = false;
      this.stats.smashed++;
      const p = this.addScore(25);
      this.emit('smash', { k: e.k, x: e.x + (e.w || 1) / 2, y: (e.y0 || 0) + 0.5, points: p });
      return;
    }
    if (this.invuln > 0) return;
    if (this.helmet) {
      this.helmet = false;
      this.stats.helmetsUsed++;
      e.alive = false;
      this.invuln = 1.2;
      this.setMult(this.mult - 1);
      this.emit('helmetSave', { k: e.k, x: e.x + (e.w || 1) / 2, y: (e.y0 || 0) + 0.5 });
      return;
    }
    this.die('crash', e);
  }

  die(cause, e) {
    this.dead = true;
    this.deathCause = cause;
    this.deathKind = e?.k || null;
    this.emit('death', { cause, k: e?.k });
  }

  /** Second chance: clear the road ahead and continue. */
  revive() {
    if (!this.dead) return;
    this.dead = false;
    this.revived = true;
    for (const e of this.entities) {
      if (e.k === 'bolt' || e.k === 'part' || e.k === 'token' || e.k === 'power' || e.k === 'task' || e.k === 'gate' || e.k === 'checkpoint') continue;
      if (e.x + (e.w || 0) > this.x - 3 && e.x < this.x + 28) e.alive = false;
    }
    this.y = 0;
    this.vy = 0;
    this.onGround = true;
    this.sliding = false;
    this.jumps = 0;
    this.invuln = 2.5;
    this.emit('revive');
  }

  /** Cheap copy for look-ahead planning (only nearby entities are copied). */
  clone() {
    const c = Object.create(Sim.prototype);
    for (const k of Object.keys(this)) {
      const v = this[k];
      if (v === null || typeof v !== 'object') c[k] = v;
    }
    c.upgrades = this.upgrades;
    c.power = { ...this.power };
    c.charge = { ...this.charge };
    c.stats = { ...this.stats };
    c.partsByCity = { ...this.partsByCity };
    c.gateStars = { ...this.gateStars };
    c.pendingTask = null;
    c.events = [];
    c.entities = [];
    for (const e of this.entities) {
      if (e.x + (e.w || 0) < this.x - 6) continue;
      if (e.x > this.x + 70) break;
      c.entities.push({ ...e });
    }
    c.loadedUntil = this.loadedUntil;
    c.headless = true;
    return c;
  }

  /** Summary submitted to the server at the end of a run. */
  summary() {
    const ci = cityAt(this.x).index;
    return {
      distance: Math.floor(this.x - this.startX),
      score: Math.floor(this.score),
      bolts: this.stats.bolts,
      parts: this.stats.parts,
      tokens: this.stats.tokens,
      tasks: this.stats.tasks,
      tasksFailed: this.stats.tasksFailed,
      gates: this.stats.gates,
      stars: this.stats.stars,
      perfectCities: this.stats.perfectCities,
      maxMult: this.maxMult,
      cityIndex: ci,
      powerups: this.stats.powerups,
      smashed: this.stats.smashed,
      revived: this.revived,
      cityStars: Object.entries(this.gateStars).map(([k, v]) => [Number(k), v]),
      time: Math.round(this.time * 10) / 10,
    };
  }

  energyEarned() {
    return computeEnergy(this.summary(), this.upgrades);
  }
}

export function computeEnergy(s, upgrades = {}) {
  return Math.floor(s.bolts * boltValue(upgrades)) + s.tokens * SCORE.tokenEnergy + s.stars * SCORE.starEnergy;
}

export function cityName(index, lang = 'lt') {
  return CITIES[index % CITIES.length].name[lang];
}
