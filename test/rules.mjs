import assert from 'node:assert/strict';
import { botRun } from '../shared/bot.js';
import { minTimeFor } from '../shared/config.js';
import { validateRun, applyRun, emptyPlayerData, normalizeData, buy, equip } from '../server/rules.mjs';

const seed = 'rules-seed';
const sim = botRun(seed, { maxDistance: 1500 });
const s = sim.summary();
const run = { seed, mode: 'normal', upgrades: {} };
const t = minTimeFor(s.distance) + 30;

// an honest run validates
const ok = validateRun(run, s, t);
assert.ok(ok.ok, `honest run rejected: ${ok.reasons}`);

// cheating attempts are rejected
assert.ok(!validateRun(run, { ...s, score: s.score * 3 }, t).ok, 'inflated score');
assert.ok(!validateRun(run, { ...s, bolts: s.bolts + 500 }, t).ok, 'extra bolts');
assert.ok(!validateRun(run, s, 10).ok, 'too fast');
assert.ok(!validateRun(run, { ...s, maxMult: 15 }, t).ok, 'impossible multiplier');

// shields: the super run covers ground faster than the nominal curve, the server allows for it
{
  const { Sim } = await import('../shared/sim.js');
  const { Bot } = await import('../shared/bot.js');
  const { ABILITIES } = await import('../shared/config.js');
  const sh = new Sim({ seed: 'rules-shield' });
  sh.charge.shield = ABILITIES.shield.cost; // as if charged on the way
  const bot = new Bot();
  while (!sh.dead && sh.x - sh.startX < 1200) {
    const inp = bot.input(sh);
    if (sh.charge.shield >= ABILITIES.shield.cost) inp.shield = true;
    sh.step(1 / 120, inp);
    if (sh.pendingTask) sh.resolveTask(true);
    sh.events.length = 0;
  }
  const ss = { ...sh.summary(), bolts: sh.summary().bolts + ABILITIES.shield.cost };
  assert.equal(ss.shields, 1);
  assert.ok(minTimeFor(ss.distance) > sh.time, 'the super run beats the nominal curve');
  const r = validateRun({ seed: 'rules-shield', mode: 'normal', upgrades: {} }, ss, sh.time);
  assert.ok(!r.reasons.includes('too_fast') && !r.reasons.includes('shields'), `shield run rejected: ${r.reasons}`);
  assert.ok(!validateRun(run, { ...s, shields: 50 }, 10).ok, 'shields without the bolts to charge them');
}
assert.ok(!validateRun(run, { ...s, score: -5 }, t).ok, 'negative');
assert.ok(!validateRun(run, { ...s, cityStars: [[0, 3], [1, 3], [2, 3]], stars: 1 }, t).ok, 'stars');
assert.ok(!validateRun(run, { ...s, distance: 'abc' }, t).ok, 'garbage');

// progression + achievements
const d = emptyPlayerData();
const r1 = applyRun(d, ok.summary, run, { birthday: true });
assert.ok(r1.energy > 0 && r1.newBest);
assert.ok(d.achievements.firstrun && d.achievements.km1 && d.achievements.birthday);
assert.equal(d.stats.runs, 1);
const r2 = applyRun(d, { ...ok.summary, score: 1 }, run);
assert.ok(!r2.newBest && !r2.unlocked.includes('firstrun'));

// shop
const shop = normalizeData({ energy: 10000 });
buy(shop, 'upgrade', 'magnet');
assert.equal(shop.upgrades.magnet, 1);
import('../server/rules.mjs').then(({ grantWorkshop }) => {
  const g = normalizeData({ energy: 0, upgrades: { magnet: 5 }, cosmetics: { owned: ['suit', 'birthday', 'vest', 'tux'] } });
  const u = grantWorkshop(g);
  assert.deepEqual(u.sort(), ['maxed', 'shopper', 'stylist']);
  assert.equal(g.energy, 50 + 300 + 150);
  assert.deepEqual(grantWorkshop(g), [], 'only once');
});
assert.equal(shop.energy, 8800);
assert.throws(() => buy(shop, 'upgrade', 'secondChance'), /not_enough/);
assert.throws(() => buy(shop, 'cosmetic', 'gold'), /unknown_item/);
assert.throws(() => buy(shop, 'upgrade', 'nope'), /unknown_item/);
buy(shop, 'cosmetic', 'vest');
assert.equal(shop.cosmetics.equipped, 'vest');
equip(shop, 'birthday');
assert.throws(() => equip(shop, 'tux'), /not_owned/);
const maxed = normalizeData({ energy: 99999, upgrades: { startHelmet: 1 } });
assert.throws(() => buy(maxed, 'upgrade', 'startHelmet'), /maxed/);
console.log('ok');
