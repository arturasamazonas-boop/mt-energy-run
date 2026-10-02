// Look-ahead autopilot. Used by tests (course feasibility) and the menu attract mode.
import { Sim } from './sim.js';

const DT = 1 / 120;
const HORIZON = 1.4;

const PLANS = [
  { name: 'jumpFull', hold: 9, dbl: null },
  { name: 'jumpMid', hold: 0.17, dbl: null },
  { name: 'jumpShort', hold: 0.1, dbl: null },
  { name: 'dbl15', hold: 9, dbl: 0.15 },
  { name: 'dbl25', hold: 9, dbl: 0.25 },
  { name: 'dbl35', hold: 9, dbl: 0.35 },
  { name: 'dbl45', hold: 9, dbl: 0.45 },
  { name: 'slide05', slide: 0.5 },
  { name: 'slide09', slide: 0.9 },
  { name: 'slide14', slide: 1.4 },
  { name: 'airDbl', air: true, hold: 9 },
];

/** Executes one plan step by step; identical in look-ahead and in real play. */
class PlanRunner {
  constructor(plan) {
    this.plan = plan;
    this.n = 0;
    this.done = false;
  }
  next(sim) {
    const p = this.plan;
    const t = this.n * DT;
    this.n++;
    if (p.slide) {
      if (t >= p.slide) this.done = true;
      return { slide: t < p.slide };
    }
    if (p.air) {
      if (t > 0.05 && sim.onGround) this.done = true;
      return { jump: t === 0, jumpHeld: !this.done };
    }
    if (t > 0.05 && sim.onGround) {
      this.done = true;
      return {};
    }
    const inp = { jump: t === 0, jumpHeld: t < p.hold };
    if (p.dbl !== null && this.n - 1 === Math.round(p.dbl / DT)) inp.jump = true;
    if (p.dbl !== null && t >= p.dbl) inp.jumpHeld = true;
    if (t > 2) this.done = true;
    return inp;
  }
}

/** Simulate a plan from a clone; returns survival time (HORIZON+ if alive). */
function evaluate(sim, plan) {
  const c = sim.clone();
  const runner = plan ? new PlanRunner(plan) : null;
  let t = 0;
  while (t < HORIZON) {
    const inp = runner && !runner.done ? runner.next(c) : {};
    c.step(DT, inp);
    if (c.pendingTask) c.pendingTask = null;
    if (c.dead) return t;
    t += DT;
  }
  return HORIZON + (c.stats.bolts - sim.stats.bolts) * 0.001;
}

export class Bot {
  constructor() {
    this.runner = null;
    this.cooldown = 0;
  }

  /** Returns an input object for the next step of `sim`. */
  input(sim) {
    if (this.runner) {
      const inp = this.runner.next(sim);
      if (this.runner.done) this.runner = null;
      return inp;
    }
    if (this.cooldown > 0) {
      this.cooldown -= DT;
      return {};
    }
    const idle = evaluate(sim, null);
    if (idle >= HORIZON) {
      this.cooldown = 1 / 40;
      return {};
    }
    let best = null;
    let bestT = idle;
    for (const p of PLANS) {
      if (p.air ? sim.onGround || sim.jumps >= 2 : !p.slide && !sim.onGround && sim.coyote <= 0) continue;
      const t = evaluate(sim, p);
      if (t > bestT + 1e-9) {
        bestT = t;
        best = p;
      }
    }
    // commit when the plan clears everything in view, or waiting is no longer an option
    if (best && (bestT >= HORIZON || idle < 0.3)) {
      this.runner = new PlanRunner(best);
      return this.input(sim);
    }
    return {};
  }
}

/** Run a full headless game with the bot; returns the sim when it dies or reaches maxDistance. */
export function botRun(seed, { maxDistance = 5000, upgrades = {}, startCity = 0, taskSuccess = true } = {}) {
  const sim = new Sim({ seed, upgrades, startCity });
  const bot = new Bot();
  let guard = 0;
  while (!sim.dead && sim.x - sim.startX < maxDistance && guard++ < 2e6) {
    sim.step(DT, bot.input(sim));
    if (sim.pendingTask) sim.resolveTask(taskSuccess);
    sim.events.length = 0;
  }
  return sim;
}
