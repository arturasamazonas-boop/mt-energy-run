// HTTP API integration test against an in-memory store.
import assert from 'node:assert/strict';
import { createApp } from '../server/app.mjs';
import { createMemoryStore } from '../server/store-memory.mjs';
import { botRun } from '../shared/bot.js';

let now = new Date('2026-10-24T09:00:00Z');
const store = createMemoryStore();
const mailbox = [];
const sendCode = async (m) => {
  if (m.email.startsWith('fail@')) throw new Error('smtp down');
  mailbox.push(m);
};
const lastCode = (email) => [...mailbox].reverse().find((m) => m.email === email)?.code;
const server = createApp({ store, adminToken: 'admin-secret-token', clock: () => now, log: { warn() {}, error: console.error }, sendCode, secret: 'test-secret' });
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

{
  const r = await A('GET', '/api/me');
  assert.equal(r.status, 200, 'first visit is not an error');
  assert.equal(r.data.profile, null);
}
const cfg = (await A('GET', '/api/config')).data;
assert.equal(cfg.birthday, true, 'Oct 24 is the birthday');
assert.equal(cfg.emailEnabled, true);
assert.equal((await A('POST', '/api/register', { name: 'x' })).status, 400);
const reg = await A('POST', '/api/register', { name: 'Mindaugas Z' });
assert.equal(reg.status, 200);
assert.equal(reg.data.recoveryCode, undefined, 'no recovery codes any more');
assert.equal(reg.data.profile.secured, false);
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
assert.equal(fin.data.ranks.all.above, null, 'nobody above the leader');
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

// email protection (optional) ------------------------------------------------
assert.equal((await A('POST', '/api/email/code', { email: 'nope' })).status, 400);
assert.equal((await A('POST', '/api/email/code', { email: 'fail@mt.lt' })).data.error, 'send_failed');
const ch = (await A('POST', '/api/email/code', { email: ' Mindaugas@MT.lt ', lang: 'en' })).data;
assert.ok(ch.challengeId && ch.retryAfter === 60);
assert.equal(mailbox.at(-1).email, 'mindaugas@mt.lt');
assert.equal(mailbox.at(-1).lang, 'en');
assert.equal((await A('POST', '/api/email/code', { email: 'mindaugas@mt.lt' })).status, 429, 'one code per minute per email');
const wrong = String((Number(lastCode('mindaugas@mt.lt')) + 1) % 1000000).padStart(6, '0');
const bad = await A('POST', '/api/email/verify', { challengeId: ch.challengeId, code: wrong });
assert.equal(bad.data.error, 'bad_code');
assert.equal(bad.data.attemptsLeft, 4);
assert.equal((await B('POST', '/api/email/verify', { challengeId: ch.challengeId, code: lastCode('mindaugas@mt.lt') })).data.error, 'code_expired', 'bound to the requesting browser');
const ok = await A('POST', '/api/email/verify', { challengeId: ch.challengeId, code: lastCode('mindaugas@mt.lt') });
assert.equal(ok.status, 200, JSON.stringify(ok.data));
assert.equal(ok.data.profile.secured, true);
assert.match(ok.data.profile.email, /@mt\.lt$/);
assert.ok(!ok.data.profile.email.startsWith('mindaugas'), 'email is masked');
assert.equal((await A('POST', '/api/email/verify', { challengeId: ch.challengeId, code: lastCode('mindaugas@mt.lt') })).data.error, 'code_expired', 'single use');
assert.equal((await A('GET', '/api/me')).data.profile.name, 'Mindaugas Z', 'session rotated and still valid');
assert.equal((await A('POST', '/api/email/code', { email: 'other@mt.lt' })).data.error, 'already_secured');

// too many wrong attempts burn the code
const brute = client();
await brute('POST', '/api/register', { name: 'Brute' });
const bch = (await brute('POST', '/api/email/code', { email: 'brute@mt.lt' })).data;
for (let i = 0; i < 5; i++) await brute('POST', '/api/email/verify', { challengeId: bch.challengeId, code: '000000' === lastCode('brute@mt.lt') ? '111111' : '000000' });
assert.equal((await brute('POST', '/api/email/verify', { challengeId: bch.challengeId, code: lastCode('brute@mt.lt') })).data.error, 'code_expired');
assert.equal((await brute('GET', '/api/me')).data.profile.secured, false);

// unknown email on a fresh device
const D = client();
now = new Date(now.getTime() + 61000);
const dch = (await D('POST', '/api/email/code', { email: 'nobody@mt.lt' })).data;
assert.equal((await D('POST', '/api/email/verify', { challengeId: dch.challengeId, code: lastCode('nobody@mt.lt') })).data.error, 'no_account');

// sign in on a new device with no account in that browser
const C = client();
now = new Date(now.getTime() + 61000);
const cch = (await C('POST', '/api/email/code', { email: 'mindaugas@mt.lt' })).data;
const login = await C('POST', '/api/email/verify', { challengeId: cch.challengeId, code: lastCode('mindaugas@mt.lt') });
assert.equal(login.data.profile.name, 'Mindaugas Z');
assert.equal(login.data.profile.upgrades.magnet, 1, 'progress kept');

// a browser that already played as a guest account: merge needs consent
const G = client();
await G('POST', '/api/register', { name: 'Telefonas' });
const gs = (await G('POST', '/api/run/start', { mode: 'normal' })).data;
now = new Date(now.getTime() + 140000);
const gfin = await G('POST', '/api/run/finish', { runId: gs.runId, summary: botRun(gs.seed, { maxDistance: 600 }).summary() });
assert.equal(gfin.data.accepted, true, JSON.stringify(gfin.data.reasons));
const guestEnergy = gfin.data.profile.energy;
const targetBefore = (await C('GET', '/api/me')).data.profile;
const gch = (await G('POST', '/api/email/code', { email: 'mindaugas@mt.lt' })).data;
const ask = await G('POST', '/api/email/verify', { challengeId: gch.challengeId, code: lastCode('mindaugas@mt.lt') });
assert.deepEqual(ask.data, { needsMerge: true, targetName: 'Mindaugas Z', guestName: 'Telefonas' });
assert.equal((await G('GET', '/api/me')).data.profile.name, 'Telefonas', 'nothing changed before consent');
const merged = await G('POST', '/api/email/verify', { challengeId: gch.challengeId, merge: true });
assert.equal(merged.data.profile.name, 'Mindaugas Z');
assert.equal(merged.data.profile.energy, targetBefore.energy + guestEnergy, 'energy summed');
assert.equal(merged.data.profile.stats.runs, targetBefore.stats.runs + 1, 'runs summed');
assert.equal((await A('GET', '/api/leaderboard?board=all')).data.entries.some((e) => e.name === 'Telefonas'), false, 'guest account removed');

// empty guest account is simply replaced
const E = client();
await E('POST', '/api/register', { name: 'Tuscias' });
now = new Date(now.getTime() + 61000);
const ech = (await E('POST', '/api/email/code', { email: 'mindaugas@mt.lt' })).data;
assert.equal((await E('POST', '/api/email/verify', { challengeId: ech.challengeId, code: lastCode('mindaugas@mt.lt') })).data.profile.name, 'Mindaugas Z');
assert.equal((await B('POST', '/api/register', { name: 'Tuscias' })).status, 200, 'empty guest name freed');

// rename
assert.equal((await A('POST', '/api/name', { name: 'Žydrūnė' })).status, 409);
assert.equal((await A('POST', '/api/name', { name: 'MZ' })).data.profile.name, 'MZ');

// admin
assert.equal((await A('GET', '/api/admin/overview')).status, 403);
const adm = await A('GET', '/api/admin/overview', null, { 'x-admin-token': 'admin-secret-token' });
assert.equal(adm.status, 200);
assert.equal(adm.data.players.length, 4, 'Mindaugas Z, Žydrūnė, Brute, Tuscias (guests merged or removed)');
assert.equal(adm.data.flagged.length, 1);

// logout
await A('POST', '/api/logout', {});
assert.equal((await A('GET', '/api/me')).data.profile, null, 'logged out');

// static + SPA + traversal
assert.equal((await fetch(base + '/')).status, 200);
assert.equal((await fetch(base + '/shared/config.js')).headers.get('content-type'), 'text/javascript; charset=utf-8');
assert.equal((await fetch(base + '/../server/app.mjs')).status, 404, 'server code is never served');
assert.ok(!(await (await fetch(base + '/%2e%2e/server/app.mjs')).text()).includes('createApp'), 'no traversal');
assert.equal((await fetch(base + '/healthz')).status, 200);

server.close();
console.log('ok');
