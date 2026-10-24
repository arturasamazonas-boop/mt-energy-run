import assert from 'node:assert/strict';
import { createRunOutbox } from '../public/js/run-outbox.js';

const disk = new Map();
const storage = {
  get length() { return disk.size; },
  key(i) { return [...disk.keys()][i]; },
  getItem(k) { return disk.get(k); },
  setItem(k, v) { disk.set(k, v); },
  removeItem(k) { disk.delete(k); },
};
const receipt = { accepted: true, profile: { id: 'player' }, energy: 10 };
let fail = true;
let calls = 0;
const finishRun = async (id, summary) => {
  calls++;
  assert.equal(id, 'run');
  assert.equal(summary.score, 123);
  if (fail) throw new Error('connection lost');
  return receipt;
};
let outbox = createRunOutbox({ storage, finishRun });
await assert.rejects(outbox.submit('player', 'run', { score: 123 }), /connection lost/);
assert.equal(disk.size, 1, 'failed request stays queued');
outbox = createRunOutbox({ storage, finishRun }); // page reload
assert.deepEqual(await outbox.flush('another-player'), [], 'never sends a different account\'s runs');
assert.equal(calls, 1);
fail = false;
assert.deepEqual(await outbox.flush('player'), [receipt]);
assert.equal(disk.size, 0, 'only acknowledgement clears the saved result');
assert.deepEqual(await outbox.flush('player'), []);

let resolve;
calls = 0;
outbox = createRunOutbox({ storage, finishRun: () => { calls++; return new Promise(r => { resolve = r; }); } });
const first = outbox.submit('player', 'run', { score: 123 });
const duplicate = outbox.submit('player', 'run', { score: 999 });
assert.equal(calls, 1, 'concurrent submissions share the same request');
resolve(receipt);
assert.deepEqual(await Promise.all([first, duplicate]), [receipt, receipt]);
assert.equal(disk.size, 0);

// Storage can be blocked; retries must still work within the open tab.
fail = true;
outbox = createRunOutbox({ finishRun });
await assert.rejects(outbox.submit('player', 'run', { score: 123 }));
fail = false;
assert.deepEqual(await outbox.flush('player'), [receipt]);

outbox = createRunOutbox({ storage, finishRun: async () => null });
await assert.rejects(outbox.submit('player', 'run', { score: 123 }), /invalid_response/);
assert.equal(disk.size, 1, 'empty success response cannot discard a result');

// a run in progress is kept when the page is hidden: the final result replaces it, a lost page still sends it
disk.clear();
const sent = [];
outbox = createRunOutbox({ storage, finishRun: async (id, summary) => { sent.push([id, summary.score]); return receipt; } });
outbox.keep('player', 'live', { score: 50 });
assert.deepEqual(await outbox.flush('player', 'live'), [], 'the run being played is not sent');
await outbox.submit('player', 'live', { score: 80 });
assert.deepEqual(sent, [['live', 80]], 'the final result replaces the kept copy');
outbox.keep('player', 'lost', { score: 40 });
outbox = createRunOutbox({ storage, finishRun: async (id, summary) => { sent.push([id, summary.score]); return receipt; } }); // page reload
await outbox.flush('player');
assert.deepEqual(sent.at(-1), ['lost', 40], 'a run whose page was closed is still sent');
console.log('ok (offline, reload, account isolation, concurrent requests, blocked storage, kept runs)');
