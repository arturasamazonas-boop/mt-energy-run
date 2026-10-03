// PostgreSQL store (production). Same interface as store-memory.mjs.
import pg from 'pg';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  name_key text NOT NULL UNIQUE,
  recovery_hash text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  banned boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS runs (
  id uuid PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  seed text NOT NULL,
  mode text NOT NULL,
  upgrades jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  valid boolean,
  score integer,
  distance integer,
  city_index integer,
  day text,
  week text,
  summary jsonb,
  flags text
);
ALTER TABLE players ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS players_email ON players (email) WHERE email IS NOT NULL;
CREATE TABLE IF NOT EXISTS email_codes (
  id uuid PRIMARY KEY,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  session_hash text,
  email text NOT NULL,
  code_hash text NOT NULL,
  lang text,
  expires_at bigint NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS runs_player ON runs (player_id, finished_at DESC);
CREATE INDEX IF NOT EXISTS runs_board ON runs (score DESC) WHERE finished_at IS NOT NULL AND valid;
CREATE INDEX IF NOT EXISTS runs_week ON runs (week) WHERE finished_at IS NOT NULL AND valid;
CREATE INDEX IF NOT EXISTS runs_day ON runs (day, mode) WHERE finished_at IS NOT NULL AND valid;
`;

const iso = (d) => (d ? new Date(d).toISOString() : null);

function rowToPlayer(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    nameKey: r.name_key,
    recoveryHash: r.recovery_hash,
    email: r.email || null,
    createdAt: iso(r.created_at),
    lastSeen: iso(r.last_seen),
    banned: r.banned,
    data: r.data || {},
  };
}

function rowToRun(r) {
  if (!r) return null;
  return {
    id: r.id,
    playerId: r.player_id,
    seed: r.seed,
    mode: r.mode,
    upgrades: r.upgrades || {},
    startedAt: iso(r.started_at),
    finishedAt: iso(r.finished_at),
    valid: r.valid,
    score: r.score,
    distance: r.distance,
    cityIndex: r.city_index,
    day: r.day,
    week: r.week,
    summary: r.summary,
    flags: r.flags,
  };
}

export function createPgStore(connectionString) {
  // TLS follows the connection string (e.g. ?sslmode=require). Render's internal
  // URL needs none; DATABASE_SSL=1 forces verified TLS for external hosts.
  const ssl = process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: process.env.PGSSL_ALLOW_SELF_SIGNED !== '1' } : undefined;
  const pool = new pg.Pool({ connectionString, ssl, max: 8 });
  const err = (code) => Object.assign(new Error(code), { code });

  async function tx(fn) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const out = await fn(c);
      await c.query('COMMIT');
      return out;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  }

  async function writePlayer(c, p) {
    try {
      await c.query(
        'UPDATE players SET name=$2, name_key=$3, recovery_hash=$4, banned=$5, data=$6, email=$7, last_seen=now() WHERE id=$1',
        [p.id, p.name, p.nameKey, p.recoveryHash || null, p.banned, p.data, p.email || null],
      );
    } catch (e) {
      if (e.code === '23505') throw err(String(e.constraint || '').includes('email') ? 'email_taken' : 'name_taken');
      throw e;
    }
  }

  return {
    kind: 'postgres',
    pool,
    async init() {
      await pool.query(SCHEMA);
    },
    async close() {
      await pool.end();
    },

    async createPlayer(p) {
      try {
        const { rows } = await pool.query(
          'INSERT INTO players (id, name, name_key, recovery_hash, data) VALUES ($1,$2,$3,$4,$5) RETURNING *',
          [p.id, p.name, p.nameKey, p.recoveryHash || null, p.data || {}],
        );
        return rowToPlayer(rows[0]);
      } catch (e) {
        if (e.code === '23505') throw err('name_taken');
        throw e;
      }
    },

    async getPlayer(id) {
      const { rows } = await pool.query('SELECT * FROM players WHERE id=$1', [id]);
      return rowToPlayer(rows[0]);
    },

    async playerByRecovery(hash) {
      const { rows } = await pool.query('SELECT * FROM players WHERE recovery_hash=$1', [hash]);
      return rowToPlayer(rows[0]);
    },

    async playerByEmail(email) {
      const { rows } = await pool.query('SELECT * FROM players WHERE email=$1', [email]);
      return rowToPlayer(rows[0]);
    },

    async createCode(c) {
      await pool.query(
        'INSERT INTO email_codes (id, player_id, session_hash, email, code_hash, lang, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [c.id, c.playerId || null, c.sessionHash || null, c.email, c.codeHash, c.lang || null, c.expiresAt],
      );
      await pool.query('DELETE FROM email_codes WHERE expires_at < $1', [Date.now() - 86400000]);
    },

    async getCode(id) {
      const { rows } = await pool.query('SELECT * FROM email_codes WHERE id=$1', [id]);
      const r = rows[0];
      if (!r) return null;
      return {
        id: r.id, playerId: r.player_id, sessionHash: r.session_hash, email: r.email, codeHash: r.code_hash, lang: r.lang,
        expiresAt: Number(r.expires_at), attempts: r.attempts, used: r.used, verified: r.verified,
      };
    },

    async saveCode(c) {
      await pool.query('UPDATE email_codes SET attempts=$2, used=$3, verified=$4 WHERE id=$1', [c.id, c.attempts, c.used, c.verified]);
    },

    async invalidateCodes(sessionHash) {
      if (sessionHash) await pool.query('UPDATE email_codes SET used=true WHERE session_hash=$1', [sessionHash]);
    },

    async mergeInto(sourceId, targetId, data) {
      return tx(async (c) => {
        const t = rowToPlayer((await c.query('SELECT * FROM players WHERE id=$1 FOR UPDATE', [targetId])).rows[0]);
        if (!t) throw err('not_found');
        await c.query('UPDATE runs SET player_id=$2 WHERE player_id=$1', [sourceId, targetId]);
        await c.query('DELETE FROM players WHERE id=$1', [sourceId]);
        t.data = data;
        await writePlayer(c, t);
        return t;
      });
    },

    async createSession(tokenHash, playerId) {
      await pool.query('INSERT INTO sessions (token_hash, player_id) VALUES ($1,$2)', [tokenHash, playerId]);
    },

    async playerBySession(tokenHash) {
      const { rows } = await pool.query(
        `WITH s AS (UPDATE sessions SET last_seen=now() WHERE token_hash=$1 RETURNING player_id)
         UPDATE players p SET last_seen=now() FROM s WHERE p.id=s.player_id RETURNING p.*`,
        [tokenHash],
      );
      return rowToPlayer(rows[0]);
    },

    async deleteSession(tokenHash) {
      await pool.query('DELETE FROM sessions WHERE token_hash=$1', [tokenHash]);
    },

    async mutatePlayer(id, fn) {
      return tx(async (c) => {
        const { rows } = await c.query('SELECT * FROM players WHERE id=$1 FOR UPDATE', [id]);
        const p = rowToPlayer(rows[0]);
        if (!p) throw err('not_found');
        const result = await fn(p);
        await writePlayer(c, p);
        return { player: p, result };
      });
    },

    async createRun(r) {
      await pool.query(
        'INSERT INTO runs (id, player_id, seed, mode, upgrades, started_at) VALUES ($1,$2,$3,$4,$5,$6)',
        [r.id, r.playerId, r.seed, r.mode, r.upgrades || {}, r.startedAt],
      );
    },

    async getRun(id) {
      const { rows } = await pool.query('SELECT * FROM runs WHERE id=$1', [id]);
      return rowToRun(rows[0]);
    },

    async completeRun(runId, compute) {
      return tx(async (c) => {
        const { rows } = await c.query('SELECT * FROM runs WHERE id=$1 FOR UPDATE', [runId]);
        const run = rowToRun(rows[0]);
        if (!run) throw err('run_not_found');
        if (run.finishedAt) throw err('run_finished');
        const pr = await c.query('SELECT * FROM players WHERE id=$1 FOR UPDATE', [run.playerId]);
        const player = rowToPlayer(pr.rows[0]);
        if (!player) throw err('not_found');
        const out = await compute(run, player);
        const rp = out.runPatch;
        const done = await c.query(
          `UPDATE runs SET finished_at=$2, valid=$3, score=$4, distance=$5, city_index=$6, day=$7, week=$8, summary=$9, flags=$10
           WHERE id=$1 RETURNING *`,
          [runId, rp.finishedAt || new Date().toISOString(), rp.valid, rp.score, rp.distance, rp.cityIndex, rp.day, rp.week, rp.summary, rp.flags],
        );
        if (out.player) await writePlayer(c, out.player);
        return { run: rowToRun(done.rows[0]), player: out.player || player, result: out.result };
      });
    },

    async boardRows({ week, day, mode } = {}) {
      const where = ['r.finished_at IS NOT NULL', 'r.valid', 'NOT p.banned'];
      const args = [];
      if (week) {
        args.push(week);
        where.push(`r.week=$${args.length}`);
      }
      if (day) {
        args.push(day);
        where.push(`r.day=$${args.length}`);
      }
      if (mode) {
        args.push(mode);
        where.push(`r.mode=$${args.length}`);
      }
      const { rows } = await pool.query(
        `SELECT * FROM (
           SELECT DISTINCT ON (r.player_id) r.player_id, p.name, p.data->'cosmetics'->>'equipped' AS outfit,
             r.score, r.distance, r.city_index, r.finished_at
           FROM runs r JOIN players p ON p.id=r.player_id
           WHERE ${where.join(' AND ')}
           ORDER BY r.player_id, r.score DESC, r.finished_at ASC
         ) best ORDER BY score DESC, finished_at ASC LIMIT 5000`,
        args,
      );
      return rows.map((r) => ({
        playerId: r.player_id,
        name: r.name,
        outfit: r.outfit || 'suit',
        score: r.score,
        distance: r.distance,
        cityIndex: r.city_index,
        finishedAt: iso(r.finished_at),
      }));
    },

    async listPlayers() {
      const { rows } = await pool.query('SELECT * FROM players ORDER BY created_at DESC');
      return rows.map(rowToPlayer);
    },

    async playerRuns(playerId, limit = 50) {
      const { rows } = await pool.query(
        'SELECT * FROM runs WHERE player_id=$1 AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT $2',
        [playerId, limit],
      );
      return rows.map(rowToRun);
    },

    async flaggedRuns(limit = 100) {
      const { rows } = await pool.query(
        `SELECT r.*, p.name FROM runs r JOIN players p ON p.id=r.player_id
         WHERE r.finished_at IS NOT NULL AND NOT r.valid ORDER BY r.finished_at DESC LIMIT $1`,
        [limit],
      );
      return rows.map((r) => ({ ...rowToRun(r), name: r.name }));
    },

    async setRunValid(runId, valid) {
      await pool.query('UPDATE runs SET valid=$2 WHERE id=$1', [runId, valid]);
    },

    async setBanned(playerId, banned) {
      await pool.query('UPDATE players SET banned=$2 WHERE id=$1', [playerId, banned]);
    },

    async deletePlayer(playerId) {
      await pool.query('DELETE FROM players WHERE id=$1', [playerId]);
    },

    async counts() {
      const { rows } = await pool.query(
        `SELECT (SELECT count(*) FROM players)::int AS players,
                (SELECT count(*) FROM runs WHERE finished_at IS NOT NULL)::int AS runs`,
      );
      return rows[0];
    },
  };
}
