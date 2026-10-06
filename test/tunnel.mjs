// Cable tunnel (test build): deterministic, passable, and wired into the run.
import assert from 'node:assert/strict';
import { Sim, computeEnergy } from '../shared/sim.js';
import { Bot } from '../shared/bot.js';
import { generateTunnel, TUNNEL } from '../shared/tunnel.js';

const DT = 1 / 120;

// same seed → same tunnel; every obstacle row leaves a way through
const a = generateTunnel('s', 0, 150);
assert.deepEqual(a, generateTunnel('s', 0, 150));
assert.ok(a.obs.length > 10 && a.bolts.length > 20 && a.corners.length >= 2, 'a tunnel has obstacles, energy and corners');
for (const z of new Set(a.obs.map((o) => o.z))) {
  const walls = a.obs.filter((o) => o.z === z && o.kind === 'wall').flatMap((o) => o.lanes);
  assert.ok(walls.length < 3, 'never walled in');
}

// the autopilot gets through tunnels on several seeds, early and late in a run
for (const [seed, startAt] of [['t1', null], ['t2', null], ['t3', null], ['t4', 6000], ['t5', 9000]]) {
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
  const s = new Sim({ seed: 'm', tunnels: true });
  s.x = s.tunnelPlan[0].x0 - 2;
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
  const s = new Sim({ seed: 'e5', tunnels: true });
  const bot = new Bot();
  for (let i = 0; i < 120 * 40 && !s.dead; i++) s.step(DT, bot.input(s));
  assert.ok(s.stats.tunnelBolts > 10);
  const sum = s.summary();
  const plain = { ...sum, tunnelBolts: 0 };
  assert.equal(computeEnergy(sum) - computeEnergy(plain), sum.tunnelBolts * (TUNNEL.bonus - 1));
  assert.equal(s.energyEarned(), computeEnergy(sum));
}
assert.equal(new Sim({ seed: 'm' }).entities.some((e) => e.k === 'tunnelIn'), false);
assert.ok(TUNNEL.duration > 10);
console.log('ok');
