import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createApp } from '../server/app.mjs';
import { createMemoryStore } from '../server/store-memory.mjs';

const store = createMemoryStore();
const server = createApp({ store, log: { warn() {}, error: console.error } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  // One company launch: 250 employees behind the same office NAT.
  for (let n = 0; n < 250; n++) {
    assert.equal((await fetch(base + '/api/config')).status, 200);
    assert.equal((await fetch(base + '/api/me')).status, 200);
    const response = await fetch(base + '/api/register', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: `Employee ${n}` }),
    });
    assert.equal(response.status, 200, `employee ${n} can register from shared IP`);
  }
  // Concurrent delivery of the same result applies progression exactly once.
  const reg = await fetch(base + '/api/register', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Retry Test' }),
  });
  const cookie = reg.headers.get('set-cookie').split(';')[0];
  const post = (path, body) => fetch(base + path, {
    method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const start = await (await post('/api/run/start', {})).json();
  const summary = { distance: 0, score: 0, maxMult: 1 };
  const replies = await Promise.all(Array.from({ length: 6 }, async () => {
    const r = await post('/api/run/finish', { runId: start.runId, summary });
    assert.equal(r.status, 200);
    return r.json();
  }));
  assert.ok(replies.every(r => r.accepted && r.profile.stats.runs === 1));
  assert.equal(new Set(replies.map(r => r.profile.energy)).size, 1);
} finally {
  server.closeAllConnections();
  await new Promise(r => server.close(r));
}
const processResult = spawnSync(process.execPath, ['server.mjs'], {
  env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: '' }, encoding: 'utf8', timeout: 5000,
});
assert.notEqual(processResult.status, 0);
assert.match(processResult.stderr, /DATABASE_URL is required in production/);
console.log('ok (250 shared-IP registrations, concurrent retry, production persistence guard)');
