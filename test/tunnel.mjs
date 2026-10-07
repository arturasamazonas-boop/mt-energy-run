// Bonus cable tunnel: a random event per leg, deterministic per seed, passable, wired into the run.
import assert from 'node:assert/strict';
import { Sim, computeEnergy } from '../shared/sim.js';
import { Bot } from '../shared/bot.js';
import { generateTunnel, tunnelInLeg, TUNNEL } from '../shared/tunnel.js';
import { validateRun } from '../server/rules.mjs';
import { minTimeFor, cityAt, cityStart, cityLength } from '../shared/config.js';

/** A seed whose run has a tunnel on the first or second leg after `startX`. */
function seedWithTunnel(prefix, startX = 0) {
  const ci = cityAt(startX).index;
  for (let n = 0; ; n++) {
    const seed = `${prefix}${n}`;
    if (tunnelInLeg(seed, ci, startX) || tunnelInLeg(seed, ci + 1, startX)) return seed;
  }
}

const DT = 1 / 120;

// about 30 % of the legs between two cities have a tunnel, inside the leg
{
  let n = 0;
  let total = 0;
  for (let k = 0; k < 2000; k++) {
    for (let ci = 1; ci < 10; ci++) {
      total++;
      const p = tunnelInLeg(`r${k}`, ci);
      if (!p) continue;
      n++;
      assert.ok(p.x0 >= cityStart(ci) + 100 && p.x0 + p.len <= cityStart(ci) + cityLength(ci) - 90, 'tunnel stays inside its leg');
    }
  }
  const rate = n / total;
  assert.ok(rate > 0.27 && rate < 0.33, `tunnel rate ${rate}`);
  assert.deepEqual(tunnelInLeg('x', 3), tunnelInLeg('x', 3), 'fixed per seed');
}

// same seed → same tunnel; every obstacle row leaves a way through
const a = generateTunnel('s', 0, 150);
assert.deepEqual(a, generateTunnel('s', 0, 150));
assert.ok(a.obs.length > 10 && a.bolts.length > 20 && a.corners.length >= 2, 'a tunnel has obstacles, energy and corners');
for (const z of new Set(a.obs.map((o) => o.z))) {
  const walls = a.obs.filter((o) => o.z === z && o.kind === 'wall').flatMap((o) => o.lanes);
  assert.ok(walls.length < 3, 'never walled in');
}

// the autopilot gets through tunnels on several seeds, early and late in a run
for (const [prefix, startAt] of [['t1', null], ['t2', null], ['t3', null], ['t4', 6000], ['t5', 9000]]) {
  const seed = seedWithTunnel(prefix, startAt ?? 0);
  const s = new Sim({ seed, tunnels: true, startAt });
  const bot = new Bot();
  let ins = 0;
  let outs = 0;
  for (let i = 0; i < 120 * 140 && !s.dead; i++) {
    s.step(DT, bot.input(s));
    for (const e of s.events) {
      if (e.type === 'tunnelIn') ins++;
      if (e.type === 'tunnelOut') outs++;
    }
    s.events.length = 0;
  }
  assert.ok(!s.dead, `${seed}: died ${s.deathCause}/${s.deathKind} at ${Math.round(s.x)}${s.tunnel ? ` (tunnel z ${s.tunnel.z.toFixed(1)})` : ''}`);
  assert.ok(ins >= 1 && outs >= 1, `${seed}: went through a tunnel (${ins}/${outs})`);
  assert.ok(s.stats.bolts > 0);
}

// a missed corner throws the hero back onto the road: the run goes on
{
  const seed = seedWithTunnel('m');
  const s = new Sim({ seed, tunnels: true });
  s.x = (tunnelInLeg(seed, 0) || tunnelInLeg(seed, 1)).x0 - 2;
  s.lastScoredX = s.x;
  s.ensureLoaded();
  for (let i = 0; i < 120 * 3 && !s.tunnel; i++) s.step(DT, {});
  assert.ok(s.tunnel, 'runs into the tunnel');
  s.invuln = 0;
  // only steer around obstacles, never turn
  const c = s.tunnel.def.corners[0];
  s.tunnel.def.obs.forEach((o) => (o.alive = false));
  // the jetpack has no room underground
  s.charge.jet = 999;
  assert.equal(s.useAbility('jet'), false);
  let crash = null;
  for (let i = 0; i < 120 * 30 && s.tunnel; i++) {
    s.step(DT, {});
    crash = s.events.find((e) => e.type === 'tunnelCrash') || crash;
    s.events.length = 0;
  }
  assert.ok(!s.dead && !s.tunnel && crash?.kind === 'tunnelWall', 'corner not taken: back on the road');
  assert.equal(s.stats.tunnelCrashes, 1);
  const x = s.x;
  assert.ok(Math.abs(x - (s.tunnelPlan[0].x0 + c.z)) < 2);
  // the regular course is back a little way ahead, the hero runs on
  assert.ok(s.entities.some((e) => e.alive && e.x > x + 25 && e.x < x + 140 && e.k !== 'bolt' && e.k !== 'tunnelOut'), 'course restored');
  assert.ok(!s.entities.some((e) => e.alive && e.k === 'tunnelOut' && !e.hatch && e.tunnel === 0), 'no exit portal any more');
  const bot = new Bot();
  for (let i = 0; i < 120 * 10 && !s.dead; i++) s.step(DT, bot.input(s));
  assert.ok(!s.dead, 'keeps running');
}

// bonus: tunnel bolts are worth ×5 energy
{
  const seed = seedWithTunnel('e5');
  const s = new Sim({ seed, tunnels: true });
  const bot = new Bot();
  for (let i = 0; i < 120 * 90 && !s.dead; i++) s.step(DT, bot.input(s));
  assert.ok(s.stats.tunnelBolts > 10);
  const sum = s.summary();
  const plain = { ...sum, tunnelBolts: 0 };
  assert.equal(computeEnergy(sum) - computeEnergy(plain), sum.tunnelBolts * (TUNNEL.bonus - 1));
  assert.equal(s.energyEarned(), computeEnergy(sum));
  // the server accepts an honest run with a tunnel and rejects made-up tunnel bolts
  const run = { seed, upgrades: {} };
  const ok = validateRun(run, sum, minTimeFor(sum.distance) + 1);
  assert.ok(ok.ok, JSON.stringify(ok.reasons));
  assert.equal(ok.summary.tunnelBolts, sum.tunnelBolts);
  const fake = validateRun(run, { ...sum, tunnelBolts: sum.tunnelBolts + 500, bolts: sum.bolts + 500 }, minTimeFor(sum.distance) + 1);
  assert.ok(fake.reasons.includes('tunnel_bolts'));
  const fake2 = validateRun(run, { ...sum, bolts: sum.bolts + 80 }, minTimeFor(sum.distance) + 1);
  assert.ok(fake2.reasons.includes('bolts'));
}
assert.equal(new Sim({ seed: 'm' }).entities.some((e) => e.k === 'tunnelIn'), false);
assert.ok(TUNNEL.duration > 10);
console.log('ok');
