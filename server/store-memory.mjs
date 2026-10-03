// In-memory store. Used for local development and tests. Data is lost on restart,
// so production must use PostgreSQL (see store-pg.mjs).

const clone = (v) => (v === undefined ? v : structuredClone(v));

export function createMemoryStore() {
  const players = new Map();
  const byNameKey = new Map();
  const byRecovery = new Map();
  const sessions = new Map();
  const runs = new Map();
  const byEmail = new Map();
  const codes = new Map();

  const err = (code) => Object.assign(new Error(code), { code });

  return {
    kind: 'memory',
    async init() {},
    async close() {},

    async createPlayer(p) {
      if (byNameKey.has(p.nameKey)) throw err('name_taken');
      const rec = { createdAt: new Date().toISOString(), lastSeen: new Date().toISOString(), banned: false, ...clone(p) };
      rec.email = rec.email || null;
      players.set(rec.id, rec);
      byNameKey.set(rec.nameKey, rec.id);
      if (rec.recoveryHash) byRecovery.set(rec.recoveryHash, rec.id);
      return clone(rec);
    },

    async getPlayer(id) {
      return clone(players.get(id) || null);
    },

    async playerByRecovery(hash) {
      const id = byRecovery.get(hash);
      return id ? clone(players.get(id)) : null;
    },

    async playerByEmail(email) {
      const id = byEmail.get(email);
      return id ? clone(players.get(id)) : null;
    },

    async createCode(c) {
      codes.set(c.id, { attempts: 0, used: false, verified: false, ...clone(c) });
      for (const [k, v] of codes) if (v.expiresAt < Date.now() - 86400000) codes.delete(k);
    },

    async getCode(id) {
      return clone(codes.get(id) || null);
    },

    async saveCode(c) {
      if (codes.has(c.id)) codes.set(c.id, clone(c));
    },

    async invalidateCodes(sessionHash) {
      for (const v of codes.values()) if (v.sessionHash === sessionHash) v.used = true;
    },

    /** Move a guest's runs into the target account, store merged data, delete the guest. */
    async mergeInto(sourceId, targetId, data) {
      const t = players.get(targetId);
      if (!t || !players.has(sourceId)) throw err('not_found');
      for (const r of runs.values()) if (r.playerId === sourceId) r.playerId = targetId;
      t.data = clone(data);
      await this.deletePlayer(sourceId);
      return clone(t);
    },

    async createSession(tokenHash, playerId) {
      sessions.set(tokenHash, { playerId, createdAt: Date.now() });
    },

    async playerBySession(tokenHash) {
      const s = sessions.get(tokenHash);
      if (!s) return null;
      const p = players.get(s.playerId);
      if (!p) return null;
      p.lastSeen = new Date().toISOString();
      return clone(p);
    },

    async deleteSession(tokenHash) {
      sessions.delete(tokenHash);
    },

    async mutatePlayer(id, fn) {
      const cur = players.get(id);
      if (!cur) throw err('not_found');
      const next = clone(cur);
      const result = await fn(next);
      if (next.nameKey !== cur.nameKey) {
        const other = byNameKey.get(next.nameKey);
        if (other && other !== id) throw err('name_taken');
        byNameKey.delete(cur.nameKey);
        byNameKey.set(next.nameKey, id);
      }
      if (next.email !== cur.email) {
        const other = next.email && byEmail.get(next.email);
        if (other && other !== id) throw err('email_taken');
        if (cur.email) byEmail.delete(cur.email);
        if (next.email) byEmail.set(next.email, id);
      }
      if (next.recoveryHash !== cur.recoveryHash) {
        byRecovery.delete(cur.recoveryHash);
        if (next.recoveryHash) byRecovery.set(next.recoveryHash, id);
      }
      players.set(id, next);
      return { player: clone(next), result };
    },

    async createRun(r) {
      runs.set(r.id, { ...clone(r), finishedAt: null });
    },

    async getRun(id) {
      return clone(runs.get(id) || null);
    },

    async completeRun(runId, compute) {
      const run = runs.get(runId);
      if (!run) throw err('run_not_found');
      if (run.finishedAt) throw err('run_finished');
      const player = clone(players.get(run.playerId));
      if (!player) throw err('not_found');
      const out = await compute(clone(run), player);
      Object.assign(run, out.runPatch, { finishedAt: out.runPatch.finishedAt || new Date().toISOString() });
      if (out.player) players.set(player.id, out.player);
      return { run: clone(run), player: clone(players.get(run.playerId)), result: out.result };
    },

    async boardRows({ week, day, mode } = {}) {
      const best = new Map();
      for (const r of runs.values()) {
        if (!r.finishedAt || !r.valid) continue;
        if (week && r.week !== week) continue;
        if (day && r.day !== day) continue;
        if (mode && r.mode !== mode) continue;
        const p = players.get(r.playerId);
        if (!p || p.banned) continue;
        const cur = best.get(r.playerId);
        if (!cur || r.score > cur.score || (r.score === cur.score && r.finishedAt < cur.finishedAt)) {
          best.set(r.playerId, { playerId: r.playerId, name: p.name, outfit: p.data?.cosmetics?.equipped || 'suit', score: r.score, distance: r.distance, cityIndex: r.cityIndex, finishedAt: r.finishedAt });
        }
      }
      return [...best.values()].sort((a, b) => b.score - a.score || (a.finishedAt < b.finishedAt ? -1 : 1));
    },

    // --- admin -------------------------------------------------------------
    async listPlayers() {
      return [...players.values()].map(clone);
    },

    async playerRuns(playerId, limit = 50) {
      return [...runs.values()]
        .filter((r) => r.playerId === playerId && r.finishedAt)
        .sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1))
        .slice(0, limit)
        .map(clone);
    },

    async flaggedRuns(limit = 100) {
      return [...runs.values()]
        .filter((r) => r.finishedAt && !r.valid)
        .sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1))
        .slice(0, limit)
        .map((r) => ({ ...clone(r), name: players.get(r.playerId)?.name }));
    },

    async setRunValid(runId, valid) {
      const r = runs.get(runId);
      if (r) r.valid = valid;
    },

    async setBanned(playerId, banned) {
      const p = players.get(playerId);
      if (p) p.banned = banned;
    },

    async deletePlayer(playerId) {
      const p = players.get(playerId);
      if (!p) return;
      players.delete(playerId);
      byNameKey.delete(p.nameKey);
      byRecovery.delete(p.recoveryHash);
      if (p.email) byEmail.delete(p.email);
      for (const [k, s] of sessions) if (s.playerId === playerId) sessions.delete(k);
      for (const [k, r] of runs) if (r.playerId === playerId) runs.delete(k);
    },

    async counts() {
      let finished = 0;
      for (const r of runs.values()) if (r.finishedAt) finished++;
      return { players: players.size, runs: finished };
    },
  };
}
