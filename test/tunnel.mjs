// Cable tunnel (test build): deterministic, passable, and wired into the run.
import assert from 'node:assert/strict';
import { Sim } from '../shared/sim.js';
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

// a missed corner is a crash; no tunnels unless switched on
{
  const s = new Sim({ seed: 'm', tunnels: true });
  s.x = s.tunnelPlan[0].x0 - 2;
  for (let i = 0; i < 120 * 3 && !s.tunnel; i++) s.step(DT, {});
  assert.ok(s.tunnel, 'runs into the tunnel');
  s.invuln = 0;
  // only steer around obstacles, never turn
  const c = s.tunnel.def.corners[0];
  s.tunnel.def.obs.forEach((o) => (o.alive = false));
  for (let i = 0; i < 120 * 30 && !s.dead; i++) s.step(DT, {});
  assert.ok(s.dead && s.deathKind === 'tunnelWall', 'corner not taken');
  assert.ok(Math.abs(s.tunnel.z - c.z) < 1);
  // the jetpack has no room underground
  s.dead = false;
  s.charge.jet = 999;
  assert.equal(s.useAbility('jet'), false);
}
assert.equal(new Sim({ seed: 'm' }).entities.some((e) => e.k === 'tunnelIn'), false);
assert.ok(TUNNEL.duration > 10);
console.log('ok');
