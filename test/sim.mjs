import assert from 'node:assert/strict';
import { Sim, computeEnergy } from '../shared/sim.js';
import { PHYSICS, ABILITIES, cityStart } from '../shared/config.js';

const DT = 1 / 120;
const run = (sim, secs, inp = () => ({})) => {
  for (let i = 0; i < secs / DT && !sim.dead; i++) {
    sim.step(DT, inp(i));
    if (sim.pendingTask) sim.resolveTask(true);
  }
};

// jumping reaches the expected apex and lands again
{
  const s = new Sim({ seed: 'phys' });
  s.entities = [];
  s.loadedUntil = 99;
  let maxY = 0;
  s.step(DT, { jump: true, jumpHeld: true });
  for (let i = 0; i < 120; i++) {
    s.step(DT, { jumpHeld: true });
    maxY = Math.max(maxY, s.y);
  }
  const apex = PHYSICS.jumpVelocity ** 2 / (2 * PHYSICS.gravity);
  assert.ok(Math.abs(maxY - apex) < 0.15, `apex ${maxY} vs ${apex}`);
  assert.ok(s.onGround, 'landed');
  // a short tap still clears a barrier (1.05 m)
  s.step(DT, { jump: true, jumpHeld: true });
  let m2 = 0;
  for (let i = 0; i < 120; i++) {
    s.step(DT, {});
    m2 = Math.max(m2, s.y);
  }
  assert.ok(m2 > 1.2 && m2 < apex, `tap apex ${m2}`);
}

// running into an obstacle kills, a helmet saves once
{
  const mk = (helmet) => {
    const s = new Sim({ seed: 'phys' });
    s.loadedUntil = 99;
    s.entities = [{ k: 'barrier', x: 8, w: 1.35, y0: 0, y1: 1.05, alive: true, id: 'b' }];
    s.helmet = helmet;
    return s;
  };
  const s1 = mk(false);
  run(s1, 2);
  assert.ok(s1.dead && s1.deathCause === 'crash');
  const s2 = mk(true);
  run(s2, 2);
  assert.ok(!s2.dead && !s2.helmet && s2.stats.helmetsUsed === 1);
}

// sliding under a beam survives
{
  const s = new Sim({ seed: 'phys' });
  s.loadedUntil = 99;
  s.entities = [{ k: 'beam', x: 8, w: 1.7, y0: 1.08, y1: Infinity, alive: true, id: 'b' }];
  run(s, 2, () => ({ slide: true }));
  assert.ok(!s.dead, 'slid under');
}

// falling into a pit kills
{
  const s = new Sim({ seed: 'phys' });
  s.loadedUntil = 99;
  s.entities = [{ k: 'pit', x: 6, w: 4, alive: true, id: 'p' }];
  run(s, 2);
  assert.ok(s.dead && s.deathCause === 'fall');
}

// pickups, gate stars, multiplier and revive
{
  const s = new Sim({ seed: 'phys' });
  s.loadedUntil = 99;
  s.entities = [
    { k: 'part', x: 3, y: 0.8, alive: true, id: 'a' },
    { k: 'part', x: 4, y: 0.8, alive: true, id: 'b' },
    { k: 'part', x: 5, y: 0.8, alive: true, id: 'c' },
    { k: 'bolt', x: 6, y: 0.8, alive: true, id: 'd' },
    { k: 'task', x: 7, y: 0.8, alive: true, id: 'e' },
    { k: 'gate', x: 20, w: 6, alive: true, id: 'g' },
  ];
  run(s, 2.5);
  assert.equal(s.stats.parts, 3);
  assert.equal(s.stats.bolts, 1);
  assert.equal(s.stats.tasks, 1);
  assert.equal(s.stats.gates, 1);
  assert.equal(s.stats.perfectCities, 1);
  assert.equal(s.mult, 3, 'task + perfect city');
  const sum = s.summary();
  assert.deepEqual(sum.cityStars, [[0, 3]]);
  assert.equal(computeEnergy(sum), 1 + 3 * 15);
  s.die('crash');
  s.revive();
  assert.ok(!s.dead && s.invuln > 0 && s.revived);
}

// surprises: a hanging load drops before the hero arrives; a drone dives low
{
  const s = new Sim({ seed: 'phys' });
  s.loadedUntil = 99;
  const load = { k: 'dropLoad', x: s.x + 20, w: 1.5, h: 1.25, y0: 5.5, y1: 6.75, drop: 1.15 * s.speed, landable: true, alive: true, id: 'L' };
  s.entities = [load];
  run(s, 0.3);
  assert.ok(!load.falling && load.y0 === 5.5, 'still hanging while far away');
  for (let i = 0; i < 240 && load.x - s.x > 1.5; i++) s.step(DT, {});
  assert.equal(load.y0, 0, 'on the road before the hero reaches it');
  assert.ok(!s.dead);
  run(s, 1);
  assert.ok(s.dead, 'running into the dropped load is a crash');
}
{
  const s = new Sim({ seed: 'phys' });
  s.loadedUntil = 99;
  const q = { k: 'quad', x: s.x + 25, w: 1.1, h: 0.55, y0: 1.35, y1: 1.9, dive: 0.75 * s.speed, diveY0: 0.25, alive: true, id: 'Q' };
  s.entities = [q];
  // sliding under it fails: it dives before you get there
  run(s, 3, () => ({ slide: true }));
  assert.ok(q.diving && s.dead, 'the drone dives onto a sliding hero');
}

// a quick tap is a full jump (no short hop)
{
  const apex = (held) => {
    const s = new Sim({ seed: 'phys' });
    s.entities = [];
    s.loadedUntil = 99;
    let maxY = 0;
    s.step(DT, { jump: true, jumpHeld: true });
    for (let i = 0; i < 120; i++) {
      s.step(DT, { jumpHeld: held });
      maxY = Math.max(maxY, s.y);
    }
    return maxY;
  };
  assert.ok(Math.abs(apex(false) - apex(true)) < 1e-9, 'releasing early does not shorten the jump');
}

// abilities: charged by bolts, emptied on use
{
  const s = new Sim({ seed: 'phys' });
  s.loadedUntil = 99;
  s.entities = [];
  assert.equal(s.useAbility('shield'), false, 'not charged yet');
  s.charge.shield = ABILITIES.shield.cost - 1;
  s.entities = [{ k: 'bolt', x: 3, y: 0.8, alive: true, id: 'b' }];
  const ready = [];
  run(s, 0.5);
  s.events.forEach((e) => e.type === 'abilityReady' && ready.push(e.kind));
  assert.deepEqual(ready, ['shield'], 'one more bolt fills the shield');
  // shield: an obstacle passes through
  s.entities = [{ k: 'barrier', x: s.x + 4, w: 1.35, y0: 0, y1: 1.05, alive: true, id: 'o' }];
  assert.equal(s.useAbility('shield'), true);
  assert.equal(s.charge.shield, 0);
  run(s, 0.6);
  assert.ok(!s.dead, 'shielded hero runs through');
  run(s, ABILITIES.shield.duration);
  assert.equal(s.shieldT, 0);
  s.entities = [{ k: 'barrier', x: s.x + 4, w: 1.35, y0: 0, y1: 1.05, alive: true, id: 'o2' }];
  run(s, 0.6);
  assert.ok(s.dead, 'without the shield it is a crash');
}
{
  // slow motion: runs for its duration; bolts taken meanwhile charge nothing
  const s = new Sim({ seed: 'phys' });
  s.loadedUntil = 99;
  s.entities = [3, 5, 7].map((dx, i) => ({ k: 'bolt', x: s.x + dx, y: 0.8, alive: true, id: `s${i}` }));
  s.charge.slow = ABILITIES.slow.cost;
  run(s, 0.6, (i) => ({ slow: i === 0 }));
  assert.equal(s.stats.slows, 1);
  assert.ok(s.slowT > 0 && s.slowT < ABILITIES.slow.duration);
  assert.equal(s.stats.bolts, 3);
  assert.equal(s.charge.slow, 0, 'no charge while slowed');
  assert.equal(s.charge.shield, 0, 'no charge while slowed');
  run(s, ABILITIES.slow.duration);
  assert.equal(s.slowT, 0);
}

// start options
assert.equal(new Sim({ seed: 'x', startCity: 3 }).x, cityStart(3));
assert.equal(new Sim({ seed: 'x', upgrades: { startMult: 2 } }).mult, 3);
console.log('ok');
