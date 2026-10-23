// Keep completed, server-started runs until the server acknowledges them.
// Per-run keys avoid one tab overwriting another tab's pending results.
const PREFIX = 'mter:pending-run:';

export function createRunOutbox({ finishRun, storage }) {
  const pending = new Map();
  const sending = new Map();
  function read() {
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key?.startsWith(PREFIX)) continue;
        try {
          const entry = JSON.parse(storage.getItem(key));
          if (entry?.runId && entry.playerId && entry.summary) pending.set(entry.runId, entry);
        } catch { /* ignore an invalid entry without blocking other runs */ }
      }
    } catch { /* blocked storage: retain the in-memory queue */ }
  }
  async function send(entry) {
    if (sending.has(entry.runId)) return sending.get(entry.runId);
    const request = (async () => {
      const result = await finishRun(entry.runId, entry.summary);
      if (!result?.profile || typeof result.accepted !== 'boolean') throw new Error('invalid_response');
      pending.delete(entry.runId);
      try { storage.removeItem(PREFIX + entry.runId); } catch { /* safe to replay */ }
      return result;
    })();
    sending.set(entry.runId, request);
    try { return await request; }
    finally { sending.delete(entry.runId); }
  }
  return {
    submit(playerId, runId, summary) {
      read();
      const entry = pending.get(runId) || { playerId, runId, summary };
      pending.set(runId, entry);
      try { storage.setItem(PREFIX + runId, JSON.stringify(entry)); } catch { /* retry while open */ }
      return send(entry);
    },
    async flush(playerId) {
      read();
      const results = [];
      for (const entry of pending.values()) {
        if (entry.playerId !== playerId) continue;
        try { results.push(await send(entry)); }
        catch { break; } // retry later, without flooding an unavailable server
      }
      return results;
    },
  };
}
