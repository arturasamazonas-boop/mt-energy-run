// Game controller: fixed-step simulation, attract mode, events → effects/sound/HUD.
import { Sim } from '/shared/sim.js';
import { Bot } from '/shared/bot.js';
import { CITIES, cityAt, waypointAt, legAt, SCORE } from '/shared/config.js';
import { audio } from '../audio.js';

const DT = 1 / 120;

export class Game {
  constructor({ renderer, input, ui }) {
    this.renderer = renderer;
    this.input = input;
    this.ui = ui; // callbacks: hud(state), event(type, data), over(info), task(cb), secondChance(cb), tutorial(key|null)
    this.mode = 'idle';
    this.sim = null;
    this.bot = null;
    this.t = 0;
    this.acc = 0;
    this.timeScale = 1;
    this.slowT = 0;
    this.hero = { phase: 0, blink: false, blinkT: 2, squash: 0, spinT: undefined, cheer: 0 };
    this.outfit = 'suit';
    this.birthday = false;
    this.last = performance.now();
    this.frameTimes = [];
    this.running = false;
    this.attractIdle = false;
    this.tutorial = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame((n) => {
      this.last = n;
      loop(n);
    });
  }

  // ---------------------------------------------------------------------------
  attract() {
    this.mode = 'attract';
    this.sim = new Sim({ seed: `attract-${Math.floor(Date.now() / 3.6e6)}`, upgrades: { magnet: 3 } });
    this.bot = new Bot();
    this.input.enabled = false;
    this.resetHero();
    this.renderer.fx.clear();
    this.renderer.ppm = 0;
  }

  /** Begin a real run. opts: { seed, upgrades, runId, mode, tutorial, startCity } */
  play(opts) {
    this.opts = opts;
    this.mode = 'run';
    this.sim = new Sim({ seed: opts.seed, upgrades: opts.upgrades || {}, startCity: opts.startCity || 0, startAt: opts.startAt ?? null });
    this.bot = opts.autoplay ? new Bot() : null;
    this.input.reset();
    this.input.enabled = true;
    this.resetHero();
    this.renderer.fx.clear();
    this.renderer.ppm = 0;
    this.timeScale = 1;
    this.tutorial = opts.tutorial ? { shown: new Set(), active: null, t: 0 } : null;
    this.lastCity = this.sim.cityIndex;
    this.runStart = performance.now();
    this.ui.event('city', { index: this.sim.cityIndex, first: true });
    audio.startMusic('run');
  }

  resetHero() {
    this.hero = { phase: 0, blink: false, blinkT: 2, squash: 0, spinT: undefined, cheer: 0, shadowY: 0 };
    this.prevX = this.sim?.x ?? 0;
    this.prevY = 0;
  }

  pause() {
    if (this.mode !== 'run') return;
    this.mode = 'paused';
    this.input.enabled = false;
    this.input.reset();
    this.ui.event('paused');
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'run';
    this.input.enabled = true;
    this.slowT = 0.5; // ease back in
  }

  quit() {
    this.mode = 'idle';
    this.input.enabled = false;
  }

  // ---------------------------------------------------------------------------
  /** Lower the canvas resolution once if the device cannot keep up. */
  adaptQuality(dt) {
    if (this.renderer.quality < 1 || this.mode !== 'run') return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 150) return;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    this.frameTimes.length = 0;
    if (sorted[Math.floor(sorted.length / 2)] > 0.024) {
      this.renderer.quality = 0.75;
      this.renderer.W = 0;
      this.renderer.resize();
    }
  }

  frame(dt) {
    this.t += dt;
    this.adaptQuality(dt);
    const sim = this.sim;
    if (!sim) return;

    // time scale (slow motion moments)
    let scale = 1;
    if (this.slowT > 0) {
      this.slowT = Math.max(0, this.slowT - dt);
      scale = 0.35 + 0.65 * (1 - Math.min(1, this.slowT / 0.5));
    }
    if (this.mode === 'dying') scale = 0.3;
    if (this.tutorial?.active) scale = 0.18;

    const stepping = this.mode === 'run' || this.mode === 'attract' || this.mode === 'dying';
    this.prevX = sim.x;
    this.prevY = sim.y;
    if (stepping && !sim.dead) {
      this.acc += dt * scale;
      let n = 0;
      while (this.acc >= DT && n < 12) {
        this.acc -= DT;
        n++;
        let inp;
        if (this.bot) inp = this.bot.input(sim);
        else if (this.mode === 'run') inp = this.input.consume();
        else inp = {};
        sim.step(DT, inp);
        this.handleEvents();
        if (sim.dead || sim.pendingTask) break;
      }
      if (this.tutorial) this.updateTutorial();
    }

    // hero animation state
    const h = this.hero;
    if (sim.onGround && !sim.sliding && !sim.dead) h.phase += ((sim.x - this.prevX) / 3.3) * Math.PI * 2 * 0.62;
    h.blinkT -= dt;
    if (h.blinkT < 0) {
      h.blink = !h.blink;
      h.blinkT = h.blink ? 0.11 : 2 + Math.random() * 3;
    }
    h.squash = Math.max(0, h.squash - dt * 6);
    if (h.spinT !== undefined) h.spinT += dt;
    if (h.cheer > 0) h.cheer -= dt;
    if (sim.onGround) h.shadowY = sim.y;
    else h.shadowY = this.shadowSupport(sim);
    if (sim.dead) h.deathT = (h.deathT ?? 0) + dt;

    // attract mode: restart when the bot fails
    if (this.mode === 'attract' && sim.dead && h.deathT > 1.6) this.attract();

    if (this.mode === 'dying' && h.deathT > 0.75) this.finishDeath();

    audio.setIntensity((sim.speed - 10) / 14);

    this.renderer.render({
      sim,
      t: this.t,
      dt,
      hero: h,
      outfit: this.outfit,
      attract: this.mode === 'attract' || this.mode === 'idle',
      heroFrac: this.mode === 'attract' ? this.attractFrac ?? 0.62 : 0.24,
      birthday: this.birthday,
      lang: this.renderer.lang,
    });

    if (this.mode === 'run' || this.mode === 'dying') this.ui.hud(this.hudState());
  }

  shadowSupport(sim) {
    let best = 0;
    for (const e of sim.entities) {
      if (!e.alive || !e.landable) continue;
      if (sim.x < e.x || sim.x > e.x + e.w) continue;
      if (e.y1 <= sim.y + 0.01 && e.y1 > best) best = e.y1;
    }
    if (sim.overPit(sim.x, 0.1)) return -3;
    return best;
  }

  hudState() {
    const s = this.sim;
    const ca = cityAt(s.x);
    return {
      score: Math.floor(s.score),
      mult: s.mult,
      bolts: s.stats.bolts,
      energy: s.energyEarned(),
      distance: Math.floor(s.x - s.startX),
      cityIndex: ca.index,
      wp: waypointAt(s.x)?.id || null,
      progress: legAt(s.x).progress,
      leg: legAt(s.x),
      parts: s.partsByCity[ca.index] || 0,
      power: s.power,
      helmet: s.helmet,
      double: s.power.double > 0,
    };
  }

  // ---------------------------------------------------------------------------
  handleEvents() {
    const sim = this.sim;
    const fx = this.renderer.fx;
    const R = this.renderer;
    const real = this.mode === 'run' || this.mode === 'dying';
    for (const ev of sim.events) {
      const hy = sim.y + 0.9;
      switch (ev.type) {
        case 'jump':
          fx.dust(sim.x, sim.y, 5, -3);
          if (real) audio.sfx('jump');
          break;
        case 'doubleJump':
          this.hero.spinT = 0;
          fx.ring(sim.x, sim.y + 0.2, '#FFFFFF', 0.8);
          if (real) audio.sfx('doubleJump');
          break;
        case 'land':
          if (ev.impact > 6) {
            this.hero.squash = Math.min(1, ev.impact / 20);
            fx.dust(sim.x, ev.y, 7, -2);
            if (real) audio.sfx('land', { k: Math.min(1, ev.impact / 18) });
          }
          this.hero.spinT = undefined;
          break;
        case 'slide':
          fx.dust(sim.x, sim.y, 8, -4);
          if (real) audio.sfx('slide');
          break;
        case 'dive':
          if (real) audio.sfx('dive');
          break;
        case 'bolt':
          fx.ring(ev.x, ev.y, '#FFE14A', 0.7);
          if (real) audio.sfx('bolt');
          break;
        case 'part': {
          fx.sparks(ev.x, ev.y, 16, '#9FE3FF', 6);
          fx.ring(ev.x, ev.y, '#9FE3FF', 1.4);
          fx.text(ev.x, ev.y + 0.6, `${ev.count}/3`, '#9FE3FF', 44);
          if (real) {
            audio.sfx('part');
            this.ui.event('part', ev);
          }
          break;
        }
        case 'token':
          fx.sparks(ev.x, ev.y, 20, '#FFD800', 7);
          fx.text(ev.x, ev.y + 0.6, `+${ev.points}`, '#FFD800', 48);
          if (real) audio.sfx('token');
          break;
        case 'power':
          fx.ring(ev.x, ev.y, '#FFFFFF', 1.6);
          fx.sparks(ev.x, ev.y, 14, '#FFFFFF', 5);
          if (real) {
            audio.sfx('power');
            this.ui.event('power', ev);
          }
          break;
        case 'powerEnd':
          if (real) this.ui.event('powerEnd', ev);
          break;
        case 'helmetSave':
          R.shake = 0.6;
          R.flash = 0.18;
          R.flashCol = '255,216,0';
          fx.sparks(sim.x + 0.4, hy, 24, '#FFD800', 8);
          fx.debris(sim.x + 0.6, 0.6, '#9AA3AD', 8);
          if (real) {
            audio.sfx('helmet');
            this.ui.event('helmet');
          }
          break;
        case 'smash':
          R.shake = 0.35;
          fx.debris(ev.x, ev.y, '#B57C45', 12);
          fx.text(ev.x, ev.y + 1.0, `+${ev.points}`, '#FFFFFF', 36);
          if (real) audio.sfx('smash');
          break;
        case 'mult':
          if (ev.up) fx.text(sim.x + 0.8, hy + 1.3, `x${ev.mult}`, '#FFD800', 60);
          if (real) {
            if (ev.up) audio.sfx('mult');
            this.ui.event('mult', ev);
          }
          break;
        case 'gate': {
          fx.confetti(sim.x + 6, 5, 70, 8);
          R.flash = 0.25;
          R.flashCol = '255,240,180';
          this.hero.cheer = 0.0;
          if (real) {
            audio.sfx('gate');
            this.ui.event('gate', ev);
          }
          break;
        }
        case 'checkpoint':
          if (real) {
            audio.sfx('city');
            this.ui.event('checkpoint', ev);
          }
          break;
        case 'city':
          if (real) {
            audio.sfx('city');
            this.ui.event('city', ev);
          }
          break;
        case 'task':
          if (this.mode === 'run' && !this.bot) {
            this.startTask();
          } else {
            sim.resolveTask(true);
          }
          break;
        case 'taskDone':
          if (ev.success) {
            fx.confetti(sim.x + 2, 3, 30, 5);
            fx.text(sim.x + 1, hy + 1.5, `+${ev.points}`, '#7CF0B0', 48);
          }
          break;
        case 'revive':
          R.flash = 0.6;
          if (real) audio.sfx('revive');
          break;
        case 'death':
          this.onDeath(ev);
          break;
        default:
      }
    }
    sim.events.length = 0;
  }

  startTask() {
    this.mode = 'task';
    this.input.enabled = false;
    this.input.reset();
    audio.sfx('taskStart');
    this.ui.task((success) => {
      if (this.mode !== 'task') return;
      this.sim.resolveTask(success);
      audio.sfx(success ? 'taskOk' : 'taskFail');
      this.ui.event('taskDone', { success });
      this.handleEvents();
      this.mode = 'run';
      this.input.enabled = true;
      this.slowT = 0.6;
    });
  }

  onDeath(ev) {
    const R = this.renderer;
    this.hero.deathT = 0;
    this.hero.deathY = this.sim.y;
    if (this.mode === 'attract') return;
    R.shake = ev.cause === 'fall' ? 0.3 : 1;
    R.flash = 0.45;
    R.flashCol = '255,255,255';
    if (ev.cause !== 'fall') {
      this.renderer.fx.sparks(this.sim.x + 0.4, this.sim.y + 1, 18, '#FFFFFF', 7);
      this.renderer.fx.debris(this.sim.x + 0.5, this.sim.y + 0.6, '#9AA3AD', 6);
    }
    audio.sfx(ev.cause === 'fall' ? 'fall' : 'crash');
    if (navigator.vibrate) {
      try {
        navigator.vibrate(ev.cause === 'fall' ? 60 : 120);
      } catch {
        /* ignore */
      }
    }
    this.mode = 'dying';
    this.input.enabled = false;
  }

  finishDeath() {
    const sim = this.sim;
    const canRevive = !!this.opts?.upgrades?.secondChance && !sim.revived;
    this.mode = 'over';
    if (canRevive) {
      this.ui.secondChance((yes) => {
        if (yes) {
          sim.revive();
          this.hero.deathT = undefined;
          this.handleEvents();
          this.mode = 'run';
          this.input.reset();
          this.input.enabled = true;
          this.slowT = 0.8;
        } else this.endRun();
      });
    } else this.endRun();
  }

  endRun() {
    this.mode = 'over';
    const sim = this.sim;
    const s = sim.summary();
    const ca = cityAt(sim.x);
    this.ui.over({
      summary: s,
      energy: sim.energyEarned(),
      cause: sim.deathCause,
      cityIndex: ca.index,
      city: CITIES[ca.index % CITIES.length],
      durationMs: performance.now() - this.runStart,
    });
  }

  // ---------------------------------------------------------------------------
  // First-run tutorial: slow motion + hint when a new obstacle type approaches.
  // ---------------------------------------------------------------------------
  updateTutorial() {
    const tut = this.tutorial;
    const sim = this.sim;
    if (tut.active) {
      tut.t += 1 / 60;
      const a = tut.active;
      const done =
        (a.kind === 'jump' && !sim.onGround) ||
        (a.kind === 'slide' && sim.sliding) ||
        (a.kind === 'double' && sim.jumps === 2) ||
        sim.x > a.until ||
        tut.t > 6;
      if (done) {
        tut.active = null;
        this.ui.tutorial(null);
        if (tut.shown.size >= 4) this.tutorial = null;
      }
      return;
    }
    for (const e of sim.entities) {
      if (!e.alive || e.x < sim.x) continue;
      if (e.x > sim.x + 9) break;
      let kind = null;
      if (['cone', 'barrier', 'drum', 'cable', 'crate'].includes(e.k)) kind = 'jump';
      else if (e.k === 'pit') kind = 'pit';
      else if (['beam', 'rack', 'birds'].includes(e.k)) kind = 'slide';
      else if (e.k === 'stack') kind = 'double';
      if (!kind || tut.shown.has(kind === 'pit' ? 'jump' : kind)) continue;
      const lead = kind === 'double' ? 5.2 : kind === 'pit' ? 3.6 : 4.2;
      if (e.x - sim.x > lead) continue;
      const k = kind === 'pit' ? 'jump' : kind;
      tut.shown.add(k);
      tut.active = { kind: k, until: e.x + (e.w || 1) };
      tut.t = 0;
      this.ui.tutorial(k);
      break;
    }
  }

  fps() {
    return 0;
  }
}

export { SCORE };
