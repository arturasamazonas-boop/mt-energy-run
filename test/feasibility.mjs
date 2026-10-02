// The autopilot must be able to survive generated courses: proves every pattern is
// physically passable (no power-ups needed thanks to look-ahead planning).
import assert from 'node:assert/strict';
import { botRun } from '../shared/bot.js';

const deep = process.argv.includes('--deep');
const seeds = deep ? ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'daily-2026-10-24'] : ['f1', 'f2'];
const dist = deep ? 11000 : 2600;
for (const seed of seeds) {
  const s = botRun(seed, { maxDistance: dist });
  assert.ok(!s.dead, `bot died on seed ${seed} at ${s.x.toFixed(1)} m (${s.deathCause})`);
}
console.log('ok');
