// HTTP application: static files + JSON API. No framework, Node built-ins only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { normalizeName, nameKey, GAME_VERSION } from '../shared/config.js';
import { normalizeData, emptyPlayerData, validateRun, applyRun, buy, equip } from './rules.mjs';
import { vilniusDay, isoWeekKey, isBirthday } from './time.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATIC_DIRS = [
  { prefix: '/shared/', dir: path.join(ROOT, 'shared') },
  { prefix: '/', dir: path.join(ROOT, 'public') },
];
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const COOKIE = 'mter';
const RECOVERY_WORDS = ['VEJAS', 'SAULE', 'SROVE', 'LAIDAS', 'BANGA', 'ZAIBAS', 'GALIA', 'VOLTAS', 'KABELIS', 'TINKLAS', 'STOTIS', 'TURBINA', 'DUJOS', 'IMPULSAS', 'FAZE', 'RELE'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function normalizeRecovery(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function newRecoveryCode() {
  const word = RECOVERY_WORDS[crypto.randomInt(RECOVERY_WORDS.length)];
  let tail = '';
  for (let i = 0; i < 6; i++) tail += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return `${word}-${tail}`;
}

function publicProfile(p) {
  const d = normalizeData(p.data);
  return {
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    energy: d.energy,
    upgrades: d.upgrades,
    cosmetics: d.cosmetics,
    stats: d.stats,
    achievements: d.achievements,
    cityStars: d.cityStars,
  };
}

/** Tiny fixed-window rate limiter. */
function limiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    let h = hits.get(key);
    if (!h || now - h.t > windowMs) {
      h = { t: now, n: 0 };
      hits.set(key, h);
    }
    h.n++;
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v.t > windowMs) hits.delete(k);
    return h.n <= max;
  };
}

export function createApp({ store, adminToken = '', birthdayMode = 'auto', trustProxy = true, log = console, clock = () => new Date() } = {}) {
  const limits = {
    register: limiter(12, 60 * 60 * 1000),
    recover: limiter(20, 10 * 60 * 1000),
    runStart: limiter(240, 60 * 60 * 1000),
    api: limiter(600, 60 * 1000),
  };
  const boardCache = new Map();
  const BOARD_TTL = 4000;

  const birthdayActive = (now = clock()) => birthdayMode === 'on' || (birthdayMode !== 'off' && isBirthday(now));

  function clientIp(req) {
    if (trustProxy) {
      const f = req.headers['x-forwarded-for'];
      if (f) return String(f).split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  function isHttps(req) {
    return req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted;
  }

  function cookies(req) {
    const out = {};
    for (const part of String(req.headers.cookie || '').split(';')) {
      const i = part.indexOf('=');
      if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
    return out;
  }

  function setSessionCookie(req, res, token) {
    const attrs = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${60 * 60 * 24 * 730}`];
    if (isHttps(req)) attrs.push('Secure');
    res.setHeader('Set-Cookie', attrs.join('; '));
  }

  function send(res, status, body, headers = {}) {
    const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': typeof body === 'string' || Buffer.isBuffer(body) ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    });
    res.end(data);
  }

  async function readJson(req, limit = 32 * 1024) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > limit) {
          reject(Object.assign(new Error('too_large'), { status: 413 }));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on('end', () => {
        if (!chunks.length) return resolve({});
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch {
          reject(Object.assign(new Error('bad_json'), { status: 400 }));
        }
      });
      req.on('error', reject);
    });
  }

  async function currentPlayer(req) {
    const token = cookies(req)[COOKIE];
    if (!token || token.length < 20 || token.length > 100) return null;
    const p = await store.playerBySession(sha(token));
    if (!p || p.banned) return null;
    return p;
  }

  async function startSession(req, res, playerId) {
    const token = crypto.randomBytes(32).toString('base64url');
    await store.createSession(sha(token), playerId);
    setSessionCookie(req, res, token);
  }

  async function board(kind, now = clock()) {
    let opts;
    if (kind === 'week') opts = { week: isoWeekKey(now) };
    else if (kind === 'daily') opts = { day: vilniusDay(now), mode: 'daily' };
    else opts = {};
    const key = JSON.stringify([kind, opts]);
    const hit = boardCache.get(key);
    if (hit && Date.now() - hit.t < BOARD_TTL) return hit.rows;
    const rows = await store.boardRows(opts);
    boardCache.set(key, { t: Date.now(), rows });
    return rows;
  }

  function rankIn(rows, playerId) {
    const i = rows.findIndex((r) => r.playerId === playerId);
    return i < 0 ? null : { rank: i + 1, total: rows.length, score: rows[i].score };
  }

  // ---------------------------------------------------------------------------
  // API routes
  // ---------------------------------------------------------------------------
  const routes = {
    'GET /api/config': async (req) => {
      const now = clock();
      return { version: GAME_VERSION, birthday: birthdayActive(now), today: vilniusDay(now), week: isoWeekKey(now), serverTime: now.toISOString(), storage: store.kind };
    },

    'GET /api/me': async (req) => {
      const p = await currentPlayer(req);
      if (!p) return [401, { error: 'no_session' }];
      return { profile: publicProfile(p) };
    },

    'POST /api/register': async (req, res, body) => {
      if (!limits.register(clientIp(req))) return [429, { error: 'rate_limited' }];
      const name = normalizeName(body.name);
      if (!name) return [400, { error: 'bad_name' }];
      const key = nameKey(name);
      if (key.length < 2) return [400, { error: 'bad_name' }];
      const code = newRecoveryCode();
      let p;
      try {
        p = await store.createPlayer({
          id: crypto.randomUUID(),
          name,
          nameKey: key,
          recoveryHash: sha(normalizeRecovery(code)),
          data: emptyPlayerData(),
        });
      } catch (e) {
        if (e.code === 'name_taken') return [409, { error: 'name_taken' }];
        throw e;
      }
      await startSession(req, res, p.id);
      return { profile: publicProfile(p), recoveryCode: code };
    },

    'POST /api/recover': async (req, res, body) => {
      if (!limits.recover(clientIp(req))) return [429, { error: 'rate_limited' }];
      const norm = normalizeRecovery(body.code);
      if (norm.length < 8 || norm.length > 20) return [400, { error: 'bad_code' }];
      const p = await store.playerByRecovery(sha(norm));
      if (!p || p.banned) return [404, { error: 'bad_code' }];
      await startSession(req, res, p.id);
      return { profile: publicProfile(p) };
    },

    'POST /api/recovery/new': async (req) => {
      const p = await currentPlayer(req);
      if (!p) return [401, { error: 'no_session' }];
      const code = newRecoveryCode();
      await store.mutatePlayer(p.id, (pl) => {
        pl.recoveryHash = sha(normalizeRecovery(code));
      });
      return { recoveryCode: code };
    },

    'POST /api/logout': async (req, res) => {
      const token = cookies(req)[COOKIE];
      if (token) await store.deleteSession(sha(token));
      res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
      return { ok: true };
    },

    'POST /api/name': async (req, res, body) => {
      const p = await currentPlayer(req);
      if (!p) return [401, { error: 'no_session' }];
      const name = normalizeName(body.name);
      if (!name || nameKey(name).length < 2) return [400, { error: 'bad_name' }];
      try {
        const { player } = await store.mutatePlayer(p.id, (pl) => {
          pl.name = name;
          pl.nameKey = nameKey(name);
        });
        boardCache.clear();
        return { profile: publicProfile(player) };
      } catch (e) {
        if (e.code === 'name_taken') return [409, { error: 'name_taken' }];
        throw e;
      }
    },

    'POST /api/run/start': async (req, res, body) => {
      const p = await currentPlayer(req);
      if (!p) return [401, { error: 'no_session' }];
      if (!limits.runStart(p.id)) return [429, { error: 'rate_limited' }];
      const mode = body.mode === 'daily' ? 'daily' : 'normal';
      const now = clock();
      const seed = mode === 'daily' ? `daily-${vilniusDay(now)}` : crypto.randomBytes(8).toString('hex');
      const d = normalizeData(p.data);
      const run = { id: crypto.randomUUID(), playerId: p.id, seed, mode, upgrades: d.upgrades, startedAt: now.toISOString() };
      await store.createRun(run);
      return { runId: run.id, seed, mode, upgrades: d.upgrades, day: vilniusDay(now) };
    },

    'POST /api/run/finish': async (req, res, body) => {
      const p = await currentPlayer(req);
      if (!p) return [401, { error: 'no_session' }];
      const runId = String(body.runId || '');
      if (!/^[0-9a-f-]{36}$/.test(runId)) return [400, { error: 'bad_run' }];
      const run = await store.getRun(runId);
      if (!run || run.playerId !== p.id) return [404, { error: 'bad_run' }];
      const now = clock();
      const elapsed = (now - new Date(run.startedAt)) / 1000;
      // the daily seed is only valid on its own day (+ grace for runs crossing midnight)
      let { ok, reasons, summary } = validateRun(run, body.summary, elapsed);
      if (run.mode === 'daily' && run.seed !== `daily-${vilniusDay(new Date(run.startedAt))}`) {
        ok = false;
        reasons = [...reasons, 'daily_seed'];
      }
      let out;
      try {
        out = await store.completeRun(runId, async (r, player) => {
          const data = normalizeData(player.data);
          let result = { energy: 0, unlocked: [], newBest: false };
          if (ok) result = applyRun(data, summary, r, { birthday: birthdayActive(now) });
          player.data = data;
          return {
            runPatch: {
              finishedAt: now.toISOString(),
              valid: ok,
              score: summary.score,
              distance: summary.distance,
              cityIndex: summary.cityIndex,
              day: r.mode === 'daily' ? r.seed.slice(6) : vilniusDay(now),
              week: isoWeekKey(now),
              summary,
              flags: reasons.join(',') || null,
            },
            player,
            result,
          };
        });
      } catch (e) {
        if (e.code === 'run_finished') return [409, { error: 'run_finished' }];
        throw e;
      }
      if (!ok) log.warn?.(`[run] rejected ${p.name} ${runId}: ${reasons.join(',')}`);
      boardCache.clear();
      const [all, week] = await Promise.all([board('all', now), board('week', now)]);
      const ranks = { all: rankIn(all, p.id), week: rankIn(week, p.id) };
      if (run.mode === 'daily') ranks.daily = rankIn(await board('daily', now), p.id);
      return {
        accepted: ok,
        reasons: ok ? undefined : reasons,
        energy: out.result.energy,
        unlocked: out.result.unlocked,
        newBest: out.result.newBest,
        profile: publicProfile(out.player),
        ranks,
      };
    },

    'POST /api/shop/buy': async (req, res, body) => {
      const p = await currentPlayer(req);
      if (!p) return [401, { error: 'no_session' }];
      try {
        const { player } = await store.mutatePlayer(p.id, (pl) => {
          const data = normalizeData(pl.data);
          buy(data, body.kind, String(body.id || ''));
          pl.data = data;
        });
        return { profile: publicProfile(player) };
      } catch (e) {
        if (['unknown_item', 'maxed', 'not_enough', 'owned'].includes(e.code)) return [400, { error: e.code }];
        throw e;
      }
    },

    'POST /api/equip': async (req, res, body) => {
      const p = await currentPlayer(req);
      if (!p) return [401, { error: 'no_session' }];
      try {
        const { player } = await store.mutatePlayer(p.id, (pl) => {
          const data = normalizeData(pl.data);
          equip(data, String(body.id || ''));
          pl.data = data;
        });
        boardCache.clear();
        return { profile: publicProfile(player) };
      } catch (e) {
        if (e.code === 'not_owned') return [400, { error: e.code }];
        throw e;
      }
    },

    'GET /api/leaderboard': async (req, res, body, url) => {
      const kind = ['all', 'week', 'daily'].includes(url.searchParams.get('board')) ? url.searchParams.get('board') : 'all';
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 100));
      const p = await currentPlayer(req);
      const rows = await board(kind);
      const entries = rows.slice(0, limit).map((r, i) => ({
        rank: i + 1,
        name: r.name,
        outfit: r.outfit,
        score: r.score,
        distance: r.distance,
        cityIndex: r.cityIndex,
        me: p ? r.playerId === p.id : false,
      }));
      let me = null;
      if (p) {
        const i = rows.findIndex((r) => r.playerId === p.id);
        if (i >= 0) me = { rank: i + 1, name: rows[i].name, score: rows[i].score, distance: rows[i].distance, cityIndex: rows[i].cityIndex };
      }
      return { board: kind, total: rows.length, entries, me };
    },

    // --- admin ----------------------------------------------------------------
    'GET /api/admin/overview': async (req) => {
      const counts = await store.counts();
      const players = await store.listPlayers();
      const rows = await board('all');
      const best = new Map(rows.map((r, i) => [r.playerId, { rank: i + 1, score: r.score }]));
      return {
        counts,
        players: players.map((p) => ({
          id: p.id,
          name: p.name,
          createdAt: p.createdAt,
          lastSeen: p.lastSeen,
          banned: p.banned,
          runs: p.data?.stats?.runs || 0,
          energy: p.data?.energy || 0,
          best: best.get(p.id) || null,
        })),
        flagged: await store.flaggedRuns(50),
      };
    },
    'GET /api/admin/runs': async (req, res, body, url) => {
      return { runs: await store.playerRuns(String(url.searchParams.get('player') || ''), 100) };
    },
    'POST /api/admin/run-valid': async (req, res, body) => {
      await store.setRunValid(String(body.runId), !!body.valid);
      boardCache.clear();
      return { ok: true };
    },
    'POST /api/admin/ban': async (req, res, body) => {
      await store.setBanned(String(body.playerId), !!body.banned);
      boardCache.clear();
      return { ok: true };
    },
    'POST /api/admin/rename': async (req, res, body) => {
      const name = normalizeName(body.name);
      if (!name) return [400, { error: 'bad_name' }];
      try {
        await store.mutatePlayer(String(body.playerId), (pl) => {
          pl.name = name;
          pl.nameKey = nameKey(name);
        });
      } catch (e) {
        if (e.code === 'name_taken') return [409, { error: 'name_taken' }];
        throw e;
      }
      boardCache.clear();
      return { ok: true };
    },
    'POST /api/admin/delete-player': async (req, res, body) => {
      await store.deletePlayer(String(body.playerId));
      boardCache.clear();
      return { ok: true };
    },
  };

  function adminAllowed(req) {
    if (!adminToken) return false;
    const got = Buffer.from(String(req.headers['x-admin-token'] || ''));
    const want = Buffer.from(adminToken);
    return got.length === want.length && crypto.timingSafeEqual(got, want);
  }

  // ---------------------------------------------------------------------------
  // Static files
  // ---------------------------------------------------------------------------
  const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy':
      "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; media-src 'self' blob: data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  };

  function serveStatic(req, res, pathname) {
    if (pathname === '/admin') pathname = '/admin.html';
    if (pathname.endsWith('/')) pathname += 'index.html';
    for (const { prefix, dir } of STATIC_DIRS) {
      if (!pathname.startsWith(prefix)) continue;
      const rel = decodeURIComponent(pathname.slice(prefix.length));
      const file = path.resolve(dir, rel);
      if (!file.startsWith(dir + path.sep)) continue;
      let st;
      try {
        st = fs.statSync(file);
      } catch {
        continue;
      }
      if (!st.isFile()) continue;
      const ext = path.extname(file).toLowerCase();
      const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
      const immutable = ext === '.woff2';
      const headers = {
        ...SECURITY_HEADERS,
        'Content-Type': MIME[ext] || 'application/octet-stream',
        ETag: etag,
        'Cache-Control': immutable ? 'public, max-age=2592000' : 'no-cache',
      };
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers);
        res.end();
        return true;
      }
      res.writeHead(200, { ...headers, 'Content-Length': st.size });
      if (req.method === 'HEAD') res.end();
      else fs.createReadStream(file).pipe(res);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  async function handle(req, res) {
    const url = new URL(req.url, 'http://local');
    const pathname = url.pathname;
    if (pathname === '/healthz') return send(res, 200, { ok: true, storage: store.kind });

    if (pathname.startsWith('/api/')) {
      if (!limits.api(clientIp(req))) return send(res, 429, { error: 'rate_limited' });
      const key = `${req.method} ${pathname}`;
      const route = routes[key];
      if (!route) return send(res, 404, { error: 'not_found' });
      if (pathname.startsWith('/api/admin/') && !adminAllowed(req)) return send(res, 403, { error: 'forbidden' });
      if (req.method === 'POST') {
        // CSRF guard: JSON requests only, from our own origin
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) return send(res, 415, { error: 'json_only' });
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'bad_origin' });
      }
      try {
        const body = req.method === 'POST' ? await readJson(req) : {};
        const out = await route(req, res, body, url);
        if (Array.isArray(out)) return send(res, out[0], out[1]);
        return send(res, 200, out);
      } catch (e) {
        if (e.status) return send(res, e.status, { error: e.message });
        log.error?.('[api]', key, e);
        return send(res, 500, { error: 'server_error' });
      }
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    if (serveStatic(req, res, pathname)) return;
    // SPA fallback
    if (!path.extname(pathname)) {
      if (serveStatic(req, res, '/index.html')) return;
    }
    send(res, 404, 'Not found');
  }

  return http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      log.error?.(e);
      try {
        send(res, 500, { error: 'server_error' });
      } catch {}
    });
  });
}
