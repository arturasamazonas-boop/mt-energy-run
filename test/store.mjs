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
