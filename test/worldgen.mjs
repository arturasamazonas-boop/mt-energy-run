import assert from 'node:assert/strict';
import { generateCity, countAvailable, PATTERN_IDS } from '../shared/worldgen.js';
import { CITIES, cityAt, cityStart, ROUTE_LENGTH, speedAt, minTimeFor, normalizeName, nameKey } from '../shared/config.js';
import { createRng } from '../shared/rng.js';

// determinism
const a = JSON.stringify(generateCity('seed-1', 3));
const b = JSON.stringify(generateCity('seed-1', 3));
assert.equal(a, b, 'same seed → same course');
assert.notEqual(a, JSON.stringify(generateCity('seed-2', 3)), 'different seed → different course');
assert.equal(createRng('x').next(), createRng('x').next());

// every city has a gate, three parts and at least one task + power-up
for (let i = 0; i < CITIES.length + 2; i++) {
  const c = generateCity('seed-1', i);
  const k = (n) => c.entities.filter((e) => e.k === n).length;
  assert.equal(k('gate'), 1, `city ${i} gate`);
  assert.equal(k('part'), 3, `city ${i} parts`);
  assert.ok(k('task') >= 1, `city ${i} task`);
  assert.ok(k('power') >= 1, `city ${i} power`);
  assert.ok(c.entities.every((e) => e.x >= c.start && e.x <= c.end), `city ${i} entities inside city`);
}

// geography helpers
assert.equal(cityAt(0).index, 0);
assert.equal(cityAt(cityStart(5) + 1).index, 5);
assert.equal(cityAt(ROUTE_LENGTH + 1).index, CITIES.length, 'route loops into lap 2');
assert.ok(speedAt(0) < speedAt(3000) && speedAt(3000) < speedAt(20000));
assert.ok(minTimeFor(1000) > 60 && minTimeFor(1000) < 100);

const avail = countAvailable('seed-1', 2400);
assert.ok(avail.bolts > 150 && avail.gates >= 2 && avail.parts >= 6, JSON.stringify(avail));
assert.ok(PATTERN_IDS.length >= 25);

// names
assert.equal(normalizeName('  Jonas   Jonaitis '), 'Jonas Jonaitis');
assert.equal(normalizeName('Žydrūnė'), 'Žydrūnė');
assert.equal(normalizeName('a'), null);
assert.equal(normalizeName('<script>'), null);
assert.equal(nameKey('Žydrūnė'), nameKey('zydrune'));
console.log('ok');
