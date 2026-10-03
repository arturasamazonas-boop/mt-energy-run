// Store contract: memory always; PostgreSQL when TEST_DATABASE_URL is set.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createMemoryStore } from '../server/store-memory.mjs';

async function contract(store) {
  await store.init();
  const id = crypto.randomUUID();
  const key = `p${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const p = await store.createPlayer({ id, name: 'Petras', nameKey: key, recoveryHash: `h-${key}`, data: { energy: 5 } });
  assert.equal(p.name, 'Petras');
  await assert.rejects(store.createPlayer({ id: crypto.randomUUID(), name: 'X', nameKey: key, recoveryHash: 'z' + key, data: {} }), /name_taken/);
  await store.createSession(`tok-${key}`, id);
  assert.equal((await store.playerBySession(`tok-${key}`)).id, id);
  assert.equal((await store.playerByRecovery(`h-${key}`)).id, id);
  const { player } = await store.mutatePlayer(id, (pl) => {
    pl.data.energy += 10;
    pl.recoveryHash = `h2-${key}`;
  });
  assert.equal(player.data.energy, 15);
  assert.equal(await store.playerByRecovery(`h-${key}`), null);
  const runId = crypto.randomUUID();
  await store.createRun({ id: runId, playerId: id, seed: 's', mode: 'normal', upgrades: {}, startedAt: new Date().toISOString() });
  const out = await store.completeRun(runId, async (run, pl) => {
    pl.data.energy += 1;
    return { runPatch: { valid: true, score: 1234, distance: 500, cityIndex: 0, day: '2026-10-24', week: '2026-W43', summary: { a: 1 }, flags: null }, player: pl, result: 42 };
  });
  assert.equal(out.result, 42);
  assert.equal(out.player.data.energy, 16);
  await assert.rejects(store.completeRun(runId, async () => ({ runPatch: {} })), /run_finished/);
  const rows = await store.boardRows({ week: '2026-W43' });
  assert.ok(rows.some((r) => r.playerId === id && r.score === 1234));
  assert.equal((await store.boardRows({ day: '2026-10-24', mode: 'daily' })).some((r) => r.playerId === id), false);
  await store.setBanned(id, true);
  assert.equal((await store.boardRows({ week: '2026-W43' })).some((r) => r.playerId === id), false);
  // email + one-time codes + merge
  const em = `${key}@mt.lt`;
  await store.mutatePlayer(id, (pl) => {
    pl.email = em;
  });
  assert.equal((await store.playerByEmail(em)).id, id);
  const gid = crypto.randomUUID();
  await store.createPlayer({ id: gid, name: 'Svečias', nameKey: `g${key}`, data: { energy: 3 } });
  await assert.rejects(store.mutatePlayer(gid, (pl) => { pl.email = em; }), /email_taken/);
  const codeId = crypto.randomUUID();
  await store.createCode({ id: codeId, playerId: gid, sessionHash: `s-${key}`, email: em, codeHash: 'abc', lang: 'lt', expiresAt: Date.now() + 600000 });
  const c = await store.getCode(codeId);
  assert.equal(c.attempts, 0);
  assert.equal(c.used, false);
  await store.saveCode({ ...c, attempts: 2, verified: true });
  assert.equal((await store.getCode(codeId)).attempts, 2);
  await store.invalidateCodes(`s-${key}`);
  assert.equal((await store.getCode(codeId)).used, true);
  const grun = crypto.randomUUID();
  await store.createRun({ id: grun, playerId: gid, seed: 's', mode: 'normal', upgrades: {}, startedAt: new Date().toISOString() });
  const merged = await store.mergeInto(gid, id, { energy: 99 });
  assert.equal(merged.data.energy, 99);
  assert.equal(await store.getPlayer(gid), null);
  assert.equal((await store.getRun(grun)).playerId, id);
  await store.deletePlayer(id);
  assert.equal(await store.getPlayer(id), null);
  await store.close();
}

await contract(createMemoryStore());
if (process.env.TEST_DATABASE_URL) {
  const { createPgStore } = await import('../server/store-pg.mjs');
  await contract(createPgStore(process.env.TEST_DATABASE_URL));
  console.log('ok (memory + postgres)');
} else console.log('ok (memory; set TEST_DATABASE_URL for postgres)');
