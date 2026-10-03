// HTTP API integration test against an in-memory store.
import assert from 'node:assert/strict';
import { createApp } from '../server/app.mjs';
import { createMemoryStore } from '../server/store-memory.mjs';
import { botRun } from '../shared/bot.js';

let now = new Date('2026-10-24T09:00:00Z');
const store = createMemoryStore();
const server = createApp({ store, adminToken: 'admin-secret-token', clock: () => now, log: { warn() {}, error: console.error } });
server.keepAliveTimeout = 120000;
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

function client() {
  let cookie = '';
  return async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* not json */
    }
    return { status: res.status, data };
  };
}

const A = client();
const B = client();

assert.equal((await A('GET', '/api/me')).status, 401);
const cfg = (await A('GET', '/api/config')).data;
assert.equal(cfg.birthday, true, 'Oct 24 is the birthday');
assert.equal((await A('POST', '/api/register', { name: 'x' })).status, 400);
const reg = await A('POST', '/api/register', { name: 'Mindaugas Z' });
assert.equal(reg.status, 200);
assert.match(reg.data.recoveryCode, /^[A-Z]+-[A-Z0-9]{6}$/);
assert.equal((await A('GET', '/api/me')).data.profile.name, 'Mindaugas Z');
assert.equal((await B('POST', '/api/register', { name: 'mindaugas  z' })).status, 409, 'case/space-insensitive duplicate');
assert.equal((await B('POST', '/api/register', { name: 'Žydrūnė' })).status, 200);

// CSRF guards
assert.equal((await fetch(base + '/api/logout', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })).status, 415);

// run: start → finish (honest bot summary)
const start = (await A('POST', '/api/run/start', { mode: 'normal' })).data;
assert.ok(start.runId && start.seed);
const sim = botRun(start.seed, { maxDistance: 1200 });
now = new Date(now.getTime() + 140000);
const fin = await A('POST', '/api/run/finish', { runId: start.runId, summary: sim.summary() });
assert.equal(fin.status, 200);
assert.equal(fin.data.accepted, true, JSON.stringify(fin.data.reasons));
assert.ok(fin.data.energy > 0 && fin.data.newBest);
assert.ok(fin.data.unlocked.includes('birthday') && fin.data.unlocked.includes('km1'));
assert.equal(fin.data.ranks.all.rank, 1);
assert.equal((await A('POST', '/api/run/finish', { runId: start.runId, summary: sim.summary() })).status, 409, 'no double submit');
assert.equal((await B('POST', '/api/run/finish', { runId: start.runId, summary: sim.summary() })).status, 404, 'not your run');

// cheated run is stored but not counted
const s2 = (await B('POST', '/api/run/start', { mode: 'daily' })).data;
assert.equal(s2.seed, 'daily-2026-10-24');
now = new Date(now.getTime() + 5000);
const cheat = await B('POST', '/api/run/finish', { runId: s2.runId, summary: { ...sim.summary(), score: 99999999 } });
assert.equal(cheat.data.accepted, false);
const board = (await B('GET', '/api/leaderboard?board=all')).data;
assert.equal(board.total, 1);
assert.equal(board.entries[0].name, 'Mindaugas Z');
assert.equal(board.me, null);

// shop
const before = (await A('GET', '/api/me')).data.profile.energy;
const bought = await A('POST', '/api/shop/buy', { kind: 'upgrade', id: 'magnet' });
assert.equal(bought.status, 200);
assert.equal(bought.data.profile.energy, before - 120 + 50, 'first purchase unlocks "shopper" (+50)');
assert.deepEqual(bought.data.unlocked, ['shopper']);
assert.equal((await A('POST', '/api/shop/buy', { kind: 'upgrade', id: 'secondChance' })).data.error, 'not_enough');
assert.equal((await A('POST', '/api/equip', { id: 'birthday' })).data.profile.cosmetics.equipped, 'birthday');

// recovery code on a new device
const C = client();
assert.equal((await C('POST', '/api/recover', { code: 'VEJAS-AAAAAA' })).status, 404);
const rec = await C('POST', '/api/recover', { code: reg.data.recoveryCode.toLowerCase().replace('-', ' ') });
assert.equal(rec.status, 200);
assert.equal(rec.data.profile.name, 'Mindaugas Z');
const newCode = (await C('POST', '/api/recovery/new', {})).data.recoveryCode;
assert.notEqual(newCode, reg.data.recoveryCode);
assert.equal((await client()('POST', '/api/recover', { code: reg.data.recoveryCode })).status, 404, 'old code invalid');

// rename
assert.equal((await A('POST', '/api/name', { name: 'Žydrūnė' })).status, 409);
assert.equal((await A('POST', '/api/name', { name: 'MZ' })).data.profile.name, 'MZ');

// admin
assert.equal((await A('GET', '/api/admin/overview')).status, 403);
const adm = await A('GET', '/api/admin/overview', null, { 'x-admin-token': 'admin-secret-token' });
assert.equal(adm.status, 200);
assert.equal(adm.data.players.length, 2);
assert.equal(adm.data.flagged.length, 1);

// logout
await A('POST', '/api/logout', {});
assert.equal((await A('GET', '/api/me')).status, 401);

// static + SPA + traversal
assert.equal((await fetch(base + '/')).status, 200);
assert.equal((await fetch(base + '/shared/config.js')).headers.get('content-type'), 'text/javascript; charset=utf-8');
assert.equal((await fetch(base + '/../server/app.mjs')).status, 404, 'server code is never served');
assert.ok(!(await (await fetch(base + '/%2e%2e/server/app.mjs')).text()).includes('createApp'), 'no traversal');
assert.equal((await fetch(base + '/healthz')).status, 200);

server.close();
console.log('ok');
