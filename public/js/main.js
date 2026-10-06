// App controller: boot, screens, account, shop, leaderboards, runs.
import { CITIES, UPGRADES, COSMETICS, ACHIEVEMENTS, GAME_VERSION, ACHIEVEMENT_BY_ID } from '/shared/config.js';
import { api } from './api.js';
import { prefs } from './prefs.js';
import { t, L, getLang, setLang, fmtNum, fmtDist } from './i18n.js';
import { audio } from './audio.js';
import { Input, isTouchDevice } from './input.js';
import { Renderer } from './render/renderer.js';
import { loadImages } from './render/buildings.js';
import { drawCharacter, idlePose, cheerPose } from './render/character.js';
import { drawPowerIcon, partIcon } from './render/entities.js';
import { Game } from './game/game.js';
import { Hud } from './ui/hud.js';
import { runTask } from './ui/tasks.js';
import { ICON } from './ui/icons.js';
import { emailDialog } from './ui/email.js';

const $ = (sel, root = document) => root.querySelector(sel);
const layer = $('#layer');
const shade = $('#shade');
const canvas = $('#game');

const state = {
  config: null,
  profile: null,
  online: true,
  screen: null,
  run: null,
  busy: false,
};

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
// test build of the cable tunnel: ?tunnel (practice runs only, nothing is submitted)
const TUNNELS = params.has('tunnel');

// ---------------------------------------------------------------------------
// Core objects
// ---------------------------------------------------------------------------
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const hud = new Hud($('#hud'), { onPause: () => game.pause() });
const game = new Game({
  renderer,
  input,
  ui: {
    hud: (s) => hud.update(s),
    event: onGameEvent,
    task: (cb) => runTask(layer, cb, params.get('task') || undefined),
    secondChance: showSecondChance,
    tutorial: (k) => hud.hint(k),
    over: onRunOver,
  },
});
input.onAnyAction = (kind) => hud.pulse(kind);
input.hitTest = (x, y) => hud.abilityAt(x, y);
input.onPause = () => {
  if (game.mode === 'run') game.pause();
  else if (game.mode === 'paused') {
    if (cancelCountdown()) showPause();
    else resumeGame();
  }
};
renderer.lang = getLang();

window.addEventListener('resize', onResize);
$('#rotate-back').addEventListener('click', () => {
  state.waitingRotate = null;
  if (['run', 'paused', 'task', 'dying'].includes(game.mode)) {
    abandonRun();
    homeScreen();
  }
  $('#rotate').hidden = true;
});
window.addEventListener('orientationchange', () => setTimeout(onResize, 200));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (game.mode === 'run') game.pause();
    else if (cancelCountdown()) showPause();
    audio.ctx?.suspend?.();
  } else audio.ctx?.resume?.();
});

function onResize() {
  renderer.resize();
  checkOrientation();
}

function isPortraitTouch() {
  return isTouchDevice() && window.innerHeight > window.innerWidth;
}

function checkOrientation() {
  const needLandscape = ['run', 'paused', 'task', 'dying'].includes(game.mode) || state.waitingRotate;
  const show = needLandscape && isPortraitTouch();
  $('#rotate').hidden = !show;
  if (show && game.mode === 'run') game.pause();
  else if (show && cancelCountdown()) showPause();
  if (!show && state.waitingRotate) {
    const go = state.waitingRotate;
    state.waitingRotate = null;
    go();
  }
}

function applyStaticTexts() {
  document.querySelectorAll('[data-t]').forEach((n) => (n.textContent = t(n.dataset.t)));
  document.documentElement.lang = getLang();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function show(html, { shadeMode = 'on' } = {}) {
  layer.innerHTML = html;
  shade.className = shadeMode === 'none' ? '' : shadeMode;
  return layer.firstElementChild;
}

function toast(title, sub, icon = ICON.medal) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="medal">${icon}</div><div><small>${sub}</small><b>${title}</b></div>`;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 4100);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function click(el, fn) {
  el?.addEventListener('click', (e) => {
    audio.unlock();
    audio.sfx('click');
    fn(e);
  });
}

function cityLabel(i) {
  const c = CITIES[i % CITIES.length];
  return `${c.flag} ${L(c.name)}`;
}

/** Draw the hero into a small canvas (menus). */
function portrait(cv, outfit = 'suit', opts = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth || 300;
  const h = cv.clientHeight || 300;
  cv.width = w * dpr;
  cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  let raf = 0;
  const t0 = performance.now();
  const frame = () => {
    const tt = (performance.now() - t0) / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (opts.disc !== false) {
      const g = ctx.createRadialGradient(cv.width / 2, cv.height * 0.55, 10, cv.width / 2, cv.height * 0.55, cv.width * 0.5);
      g.addColorStop(0, 'rgba(255,216,0,0.35)');
      g.addColorStop(1, 'rgba(255,216,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cv.width, cv.height);
    }
    const s = (cv.height / 2.05) * (opts.zoom || 1);
    ctx.translate(cv.width / 2 - 0.05 * s, cv.height * (opts.base || 0.97));
    ctx.scale(s, -s);
    const pose = opts.cheer ? cheerPose(tt) : idlePose(tt, opts.wave ? (Math.sin(tt * 0.9) > 0.55 ? 1 : 0) : 0);
    const blink = tt % 3.4 > 3.28;
    drawCharacter(ctx, pose, { outfit, t: tt, blink, expression: opts.cheer ? 'grin' : 'smile' });
    if (opts.animate !== false) raf = requestAnimationFrame(frame);
  };
  frame();
  return () => cancelAnimationFrame(raf);
}

let stopPortraits = [];
function clearPortraits() {
  stopPortraits.forEach((f) => f());
  stopPortraits = [];
}

function setProfile(p) {
  state.profile = p;
  if (p) game.outfit = p.cosmetics?.equipped || 'suit';
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  applyStaticTexts();
  game.birthday = false;
  game.attract();
  game.start();
  const imgs = loadImages();
  const fonts = document.fonts?.ready || Promise.resolve();
  let cfg = null;
  let me = null;
  try {
    cfg = await api.config();
    state.config = cfg;
    game.birthday = !!cfg.birthday || params.has('birthday');
    try {
      me = (await api.me()).profile;
    } catch (e) {
      if (e.status !== 401) throw e;
    }
  } catch {
    state.online = false;
  }
  await Promise.all([imgs, fonts]);
  renderer.scenery.cache.clear();
  $('#boot').classList.add('gone');
  setTimeout(() => $('#boot')?.remove(), 600);

  if (!state.online) {
    setProfile(guestProfile());
    homeScreen();
    toast(t('offline'), 'MT GROUP', ICON.globe);
    return;
  }
  if (!me) {
    if (DEBUG) {
      setProfile(guestProfile());
      return homeScreen();
    }
    return onboardScreen();
  }
  setProfile(me);
  afterLogin();
}

function guestProfile() {
  return {
    id: 'guest',
    name: getLang() === 'lt' ? 'Svečias' : 'Guest',
    energy: 0,
    upgrades: {},
    cosmetics: { owned: ['suit', 'birthday'], equipped: 'suit' },
    stats: { runs: prefs.get('guestRuns', 0), bestScore: prefs.get('guestBest', 0), bestCity: 0, bestDistance: 0, totalDistance: 0, totalBolts: 0 },
    achievements: {},
    cityStars: {},
    guest: true,
  };
}

function afterLogin() {
  const today = state.config?.today;
  if (game.birthday && prefs.get('bdaySeen') !== today) {
    prefs.set('bdaySeen', today);
    return birthdayScreen();
  }
  homeScreen();
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------
function onboardScreen() {
  state.screen = 'onboard';
  clearPortraits();
  game.attract();
  const emailOn = !!state.config?.emailEnabled;
  const el = show(`
    <div class="screen onboard">
      <div class="hero-wrap"><canvas class="portrait"></canvas></div>
      <form class="panel" autocomplete="off">
        <div style="display:flex;justify-content:space-between;align-items:center"><img class="logo" src="/assets/mt-logo-light.png" alt="MT GROUP"><button type="button" class="chip" data-lang>${ICON.globe}${getLang() === 'lt' ? 'EN' : 'LT'}</button></div>
        <h1>${t('welcomeTitle')}</h1>
        <div class="muted">${t('welcomeText')}</div>
        <input class="field" name="v" maxlength="20" placeholder="${t('namePh')}" autocomplete="nickname" enterkeyhint="go" required>
        <div class="error"></div>
        <button class="btn primary" type="submit">${ICON.play}${t('start')}</button>
        ${emailOn ? `<button class="link" type="button" data-alt>${t('haveEmail')}</button>` : ''}
      </form>
    </div>`, { shadeMode: 'full' });
  stopPortraits.push(portrait($('canvas.portrait', el), 'suit', { wave: true }));
  const form = $('form', el);
  const inputEl = $('input', form);
  const err = $('.error', form);
  if (!isTouchDevice()) setTimeout(() => inputEl.focus(), 50);
  click($('[data-alt]', form), () =>
    emailDialog(layer, {
      mode: 'login',
      onDone: (profile) => {
        setProfile(profile);
        toast(t('emailWelcomeBack'), 'MT GROUP', ICON.user);
        afterLogin();
      },
    }),
  );
  click($('[data-lang]', form), () => {
    setLang(getLang() === 'lt' ? 'en' : 'lt');
    renderer.lang = getLang();
    renderer.scenery.cache.clear();
    applyStaticTexts();
    onboardScreen();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    audio.unlock();
    if (state.busy) return;
    const v = inputEl.value.trim();
    if (!v) return;
    state.busy = true;
    err.textContent = '';
    try {
      const r = await api.register(v);
      setProfile(r.profile);
      afterLogin();
    } catch (ex) {
      err.textContent = ex.code === 'name_taken' ? t('nameTaken') : ex.code === 'bad_name' ? t('badName') : ex.code === 'rate_limited' ? t('rateLimited') : t('offline');
    } finally {
      state.busy = false;
    }
  });
}

/** Open the email protection dialog for the current account. */
function protectAccount(after) {
  emailDialog(layer, {
    mode: 'protect',
    onDone: (profile) => {
      setProfile(profile);
      toast(t('emailProtected'), 'MT GROUP', ICON.user);
      after?.();
    },
  });
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
function homeScreen() {
  state.screen = 'home';
  clearPortraits();
  hud.unmount();
  if (game.mode !== 'attract') game.attract();
  audio.startMusic('menu');
  const p = state.profile;
  const touch = isTouchDevice();
  const audioOn = audio.musicOn || audio.sfxOn;
  const el = show(`
    <div class="screen home">
      <div class="topbar">
        <img class="logo" src="/assets/mt-logo-light.png" alt="MT GROUP">
        <div class="right">
          <span class="chip" title="${t('energy')}"><span class="bolt">${ICON.bolt}</span>${fmtNum(p.energy)}</span>
          <button class="chip" data-go="profile">${ICON.user}${esc(p.name)}</button>
          <button class="icon-btn ${audioOn ? '' : 'off'}" data-audio aria-label="${t('audioAll')}" title="${t('audioAll')}">${audioOn ? ICON.sound : ICON.mute}</button>
          <button class="chip" data-lang>${ICON.globe}${getLang().toUpperCase()}</button>
        </div>
      </div>
      <div class="home-main">
        <div class="title"><small>MT GROUP</small>ENERGY <span>RUN</span></div>
        <div class="tagline">${t('tagline')}</div>
        ${p.stats.bestScore ? `<div class="best-card"><div><small>${t('best')}</small><b>${fmtNum(p.stats.bestScore)}</b></div><div><small>${t('bestCity')}</small><b>${cityLabel(p.stats.bestCity || 0)}</b></div></div>` : ''}
        <div class="play-row">
          <button class="btn primary big" data-play>${ICON.play}${t('play')}</button>
          <button class="daily-btn" data-daily><b>${ICON.calendar}${t('daily')}</b><span>${t('dailySub')}${state.config?.today ? ` · ${state.config.today}` : ''}</span></button>
        </div>
        <div class="nav-row">
          <button class="btn" data-go="shop">${ICON.wrench}${t('shop')}</button>
          <button class="btn" data-go="board">${ICON.trophy}${t('board')}</button>
          <button class="btn" data-go="map">${ICON.map}${t('map')}</button>
        </div>
      </div>
      <div class="home-foot">
        <span class="controls">${touch ? t('controlsTouch') : t('controlsKeys')}</span>
        <span class="ver">v${GAME_VERSION}${state.online ? '' : ' · offline'}</span>
      </div>
    </div>`);
  click($('[data-play]', el), () => startRun('normal'));
  click($('[data-daily]', el), () => startRun('daily'));
  el.querySelectorAll('[data-go]').forEach((b) =>
    click(b, () => {
      const go = b.dataset.go;
      if (go === 'shop') shopScreen();
      else if (go === 'board') boardScreen();
      else if (go === 'map') mapScreen();
      else if (go === 'profile') profileScreen();
    }),
  );
  // one switch for music + effects; the pause menu still toggles them separately
  click($('[data-audio]', el), () => {
    const on = !audioOn;
    audio.setMusic(on);
    audio.setSfx(on);
    if (on) audio.startMusic('menu');
    homeScreen();
  });
  click($('[data-lang]', el), () => {
    setLang(getLang() === 'lt' ? 'en' : 'lt');
    renderer.lang = getLang();
    renderer.scenery.cache.clear();
    applyStaticTexts();
    homeScreen();
  });
}

function sheet(title, icon, body, { tabs = '', onClose = homeScreen } = {}) {
  clearPortraits();
  const el = show(`
    <div class="panel sheet">
      <div class="sheet-head">
        <button class="icon-btn" data-close aria-label="${t('back')}">${ICON.back}</button>
        <h2>${icon}${title}</h2>
        ${tabs}
      </div>
      <div class="sheet-body">${body}</div>
    </div>`, { shadeMode: 'full' });
  click($('[data-close]', el), onClose);
  return el;
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------
function shopScreen(tab = 'upgrades') {
  state.screen = 'shop';
  const p = state.profile;
  const tabs = `<span class="chip"><span class="bolt">${ICON.bolt}</span>${fmtNum(p.energy)}</span>
    <div class="tabs"><button class="tab ${tab === 'upgrades' ? 'on' : ''}" data-tab="upgrades">${t('upgrades')}</button><button class="tab ${tab === 'outfits' ? 'on' : ''}" data-tab="outfits">${t('outfits')}</button></div>`;
  let body = `<p class="shop-hint">${t('shopHint')}</p><div class="cards">`;
  if (tab === 'upgrades') {
    for (const u of UPGRADES) {
      const lvl = p.upgrades[u.id] || 0;
      const max = u.costs.length;
      const cost = lvl < max ? u.costs[lvl] : null;
      const can = cost !== null && p.energy >= cost && !p.guest;
      body += `
        <div class="card">
          <div class="top"><div class="ico"><canvas width="80" height="80" data-icon="${u.icon}"></canvas></div><div><h3>${L(u)}</h3><p>${L(u, 'desc')}</p></div></div>
          <div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div>
          ${cost === null
            ? `<button class="btn small" disabled>${t('maxed')}</button>`
            : `<button class="btn small ${can ? 'primary' : ''}" data-buy="${u.id}" ${can ? '' : 'disabled'}>${ICON.bolt}${fmtNum(cost)}</button>`}
        </div>`;
    }
  } else {
    for (const c of COSMETICS) {
      const owned = p.cosmetics.owned.includes(c.id);
      const eq = p.cosmetics.equipped === c.id;
      let btn;
      if (eq) btn = `<button class="btn small" disabled>${t('equipped')}</button>`;
      else if (owned) btn = `<button class="btn small primary" data-equip="${c.id}">${t('equip')}</button>`;
      else if (c.achievement) btn = `<button class="btn small" disabled>${t('unlockGrand')}</button>`;
      else btn = `<button class="btn small ${p.energy >= c.cost && !p.guest ? 'primary' : ''}" data-buyc="${c.id}" ${p.energy >= c.cost && !p.guest ? '' : 'disabled'}>${ICON.bolt}${fmtNum(c.cost)}</button>`;
      body += `<div class="card outfit ${eq ? 'equipped' : ''}"><canvas data-outfit="${c.id}"></canvas><h3>${L(c)}</h3>${c.gift ? `<p>${t('giftBirthday')}</p>` : ''}${btn}</div>`;
    }
  }
  body += '</div>';
  const el = sheet(t('shop'), ICON.wrench, body, { tabs });
  el.querySelectorAll('[data-tab]').forEach((b) => click(b, () => shopScreen(b.dataset.tab)));
  el.querySelectorAll('canvas[data-icon]').forEach((cv) => {
    const ctx = cv.getContext('2d');
    ctx.translate(40, 40);
    ctx.scale(80, -80);
    const k = cv.dataset.icon;
    if (['magnet', 'drone', 'excavator', 'double', 'helmet'].includes(k)) drawPowerIcon(ctx, k, 0.36);
    else if (k === 'bolt') partIconBolt(ctx);
    else if (k === 'mult') multIcon(ctx);
    else if (k === 'heart') heartIcon(ctx);
    else partIcon(ctx, 'substation');
  });
  el.querySelectorAll('canvas[data-outfit]').forEach((cv) => stopPortraits.push(portrait(cv, cv.dataset.outfit, { animate: false, disc: false, zoom: 0.92, base: 0.96 })));
  el.querySelectorAll('[data-buy]').forEach((b) => click(b, () => doBuy('upgrade', b.dataset.buy, tab)));
  el.querySelectorAll('[data-buyc]').forEach((b) => click(b, () => doBuy('cosmetic', b.dataset.buyc, tab)));
  el.querySelectorAll('[data-equip]').forEach((b) =>
    click(b, async () => {
      try {
        setProfile((await api.equip(b.dataset.equip)).profile);
      } catch {
        /* ignore */
      }
      shopScreen(tab);
    }),
  );
}

function partIconBolt(ctx) {
  ctx.fillStyle = '#FFD800';
  ctx.beginPath();
  ctx.moveTo(0.05, 0.3);
  ctx.lineTo(-0.15, -0.02);
  ctx.lineTo(0.0, -0.02);
  ctx.lineTo(-0.06, -0.3);
  ctx.lineTo(0.15, 0.05);
  ctx.lineTo(0.01, 0.05);
  ctx.lineTo(0.08, 0.3);
  ctx.closePath();
  ctx.fill();
}

function multIcon(ctx) {
  ctx.save();
  ctx.scale(1 / 100, -1 / 100);
  ctx.fillStyle = '#FFD800';
  ctx.font = '900 42px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('x3', 0, 2);
  ctx.restore();
}

function heartIcon(ctx) {
  ctx.fillStyle = '#E2364B';
  ctx.beginPath();
  ctx.moveTo(0, -0.24);
  ctx.bezierCurveTo(-0.34, 0.0, -0.22, 0.3, 0, 0.14);
  ctx.bezierCurveTo(0.22, 0.3, 0.34, 0.0, 0, -0.24);
  ctx.fill();
}

async function doBuy(kind, id, tab) {
  if (state.busy) return;
  state.busy = true;
  try {
    const r = await api.buy(kind, id);
    setProfile(r.profile);
    audio.sfx('power');
    (r.unlocked || []).forEach((aid, i) =>
      setTimeout(() => {
        const a = ACHIEVEMENT_BY_ID[aid];
        toast(`${L(a)} · ⚡${a.reward}`, t('achievement'));
        audio.sfx('achievement');
      }, 300 + i * 900),
    );
  } catch {
    audio.sfx('bad');
  } finally {
    state.busy = false;
  }
  shopScreen(tab);
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------
async function boardScreen(kind = 'all') {
  state.screen = 'board';
  const tabs = `<div class="tabs">${[
    ['all', t('allTime')],
    ['week', t('thisWeek')],
    ['daily', t('dailyBoard')],
  ]
    .map(([k, label]) => `<button class="tab ${k === kind ? 'on' : ''}" data-tab="${k}">${label}</button>`)
    .join('')}</div>`;
  const el = sheet(t('board'), ICON.trophy, `<div class="empty">${t('loading')}</div>`, { tabs });
  el.querySelectorAll('[data-tab]').forEach((b) => click(b, () => boardScreen(b.dataset.tab)));
  if (!state.online) {
    $('.sheet-body', el).innerHTML = `<div class="empty">${t('offline')}</div>`;
    return;
  }
  try {
    const r = await api.leaderboard(kind, 200);
    if (state.screen !== 'board') return;
    const row = (e) => `
      <div class="board-row ${e.me ? 'me' : ''}">
        <div class="pos ${e.rank <= 3 ? `g${e.rank}` : ''}">${e.rank}</div>
        <div class="who"><b>${esc(e.name)}${e.me ? ` · ${t('you')}` : ''}</b><small>${cityLabel(e.cityIndex || 0)} · ${fmtDist(e.distance || 0)}</small></div>
        <div class="pts">${fmtNum(e.score)}</div>
      </div>`;
    let html = r.entries.length ? `<div class="muted" style="margin-bottom:8px">${r.total} ${t('players')}</div><div class="board-list">${r.entries.map(row).join('')}</div>` : `<div class="empty">${t('noScores')}</div>`;
    if (r.me && !r.entries.some((e) => e.me)) html += `<div class="board-me">${row({ ...r.me, me: true })}</div>`;
    $('.sheet-body', el).innerHTML = html;
  } catch {
    $('.sheet-body', el).innerHTML = `<div class="empty">${t('offline')}</div>`;
  }
}

// ---------------------------------------------------------------------------
// Route map
// ---------------------------------------------------------------------------
function mapScreen() {
  state.screen = 'map';
  const p = state.profile;
  // schematic "metro map" positions (geography-inspired, readable on phones)
  const POS = {
    vilnius: [880, 520], klaipeda: [760, 430], riga: [860, 330], tallinn: [860, 190], helsinki: [900, 70],
    stockholm: [650, 120], copenhagen: [560, 300], hamburg: [470, 410], amsterdam: [330, 420], brussels: [300, 530],
    london: [150, 450], paris: [210, 640], madrid: [90, 790], rome: [470, 800], vienna: [600, 690],
    prague: [540, 580], berlin: [660, 500], warsaw: [790, 610],
  };
  const pts = CITIES.map((c) => ({ x: POS[c.id][0], y: POS[c.id][1] }));
  const minX = 20;
  const maxX = 1000;
  const minY = 20;
  const maxY = 850;
  const best = p.stats.bestCity || 0;
  const reached = (i) => i <= best;
  let svg = `<svg viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" role="img" aria-label="${t('mapTitle')}">
    <defs><pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="rgba(255,255,255,.05)"/></pattern></defs>
    <rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" fill="url(#grid)"/>`;
  let d = '';
  pts.forEach((q, i) => (d += `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)} `));
  svg += `<path d="${d}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`;
  let dr = '';
  pts.slice(0, Math.min(best + 1, pts.length)).forEach((q, i) => (dr += `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)} `));
  if (best > 0) svg += `<path d="${dr}" fill="none" stroke="#FFD800" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`;
  const last = pts[pts.length - 1];
  svg += `<path d="M${last.x} ${last.y} Q ${(last.x + pts[0].x) / 2 + 30} ${(last.y + pts[0].y) / 2 - 40} ${pts[0].x} ${pts[0].y}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="3" stroke-dasharray="8 8"/>`;
  // checkpoints on the Vilnius → Klaipėda leg
  CITIES.forEach((c, i) => {
    (c.waypoints || []).forEach((w, k, arr) => {
      const a = pts[i];
      const b = pts[(i + 1) % CITIES.length];
      const f = (k + 1) / (arr.length + 1);
      const x = a.x + (b.x - a.x) * f;
      const y = a.y + (b.y - a.y) * f;
      svg += `<circle cx="${x}" cy="${y}" r="6" fill="${best > i || (best === i && p.stats.bestDistance >= w.from) ? '#FFD800' : '#3A3E46'}" stroke="#15171b" stroke-width="2"/>
        <text x="${x + 9}" y="${y + 20}" fill="#c9ced6" font-family="Barlow Condensed" font-weight="700" font-size="15">${esc(L(w.name))}</text>`;
    });
  });
  CITIES.forEach((c, i) => {
    const q = pts[i];
    const on = reached(i);
    const stars = p.cityStars?.[i] || 0;
    svg += `<g data-city="${i}" style="cursor:pointer">
      ${c.mt ? `<circle cx="${q.x}" cy="${q.y}" r="17" fill="none" stroke="#FFD800" stroke-width="3" stroke-dasharray="4 3"/>` : ''}
      <circle cx="${q.x}" cy="${q.y}" r="11" fill="${on ? '#FFD800' : '#3A3E46'}" stroke="#15171b" stroke-width="3"/>
      <text x="${q.x}" y="${q.y - 22}" text-anchor="middle" fill="${on ? '#fff' : '#9aa3ad'}" font-family="Barlow Condensed" font-weight="700" font-size="24">${esc(L(c.name))}</text>
      <text x="${q.x}" y="${q.y + 34}" text-anchor="middle" fill="#FFD800" font-size="18">${'★'.repeat(stars)}<tspan fill="rgba(255,255,255,.2)">${'★'.repeat(3 - stars)}</tspan></text>
    </g>`;
  });
  svg += '</svg>';
  const el = sheet(t('mapTitle'), ICON.map, `<p class="shop-hint">${t('mapHint')}</p><div class="map-wrap">${svg}</div><div class="map-info" id="map-info"></div>`);
  const info = $('#map-info', el);
  const showCity = (i) => {
    const c = CITIES[i];
    const stars = p.cityStars?.[i] || 0;
    info.innerHTML = `<h3>${c.flag} ${esc(L(c.name))} <span class="muted" style="font-size:15px">· ${esc(L(c.country))}</span></h3>
      <div>${partIconSvg()} ${esc(L(c.project))} ${c.mt ? `· <span class="yellow">${t('mtSite')}</span>` : ''}</div>
      <div class="muted">${reached(i) ? `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` : t('notReached')}</div>`;
  };
  el.querySelectorAll('[data-city]').forEach((g) => g.addEventListener('click', () => showCity(Number(g.dataset.city))));
  showCity(Math.min(best, CITIES.length - 1));
}

function partIconSvg() {
  return '<span class="yellow">⚡</span>';
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
function profileScreen() {
  state.screen = 'profile';
  const p = state.profile;
  const s = p.stats;
  const ach = [...ACHIEVEMENTS].sort((a, b) => (p.achievements[b.id] ? 1 : 0) - (p.achievements[a.id] ? 1 : 0)).map(
    (a) => `<div class="ach ${p.achievements[a.id] ? 'on' : ''}"><div class="medal">${ICON.medal}</div><div><b>${L(a)}</b><small>${L(a, 'desc')} · ⚡${a.reward}</small></div></div>`,
  ).join('');
  const body = `
    <div class="prof-grid">
      <div class="prof-sec">
        <h3>${t('yourName')}</h3>
        <form class="inline" data-name><input class="field" name="n" maxlength="20" value="${esc(p.name)}" ${p.guest ? 'disabled' : ''}><button class="btn" ${p.guest ? 'disabled' : ''}>${t('save')}</button></form>
        <div class="error" data-name-err></div>
      </div>
      <div class="prof-sec">
        <h3>${t('stats')}</h3>
        <div class="stats-grid">
          <div class="stat"><small>${t('best')}</small><b>${fmtNum(s.bestScore || 0)}</b></div>
          <div class="stat"><small>${t('runs')}</small><b>${fmtNum(s.runs || 0)}</b></div>
          <div class="stat"><small>${t('totalDist')}</small><b>${fmtDist(s.totalDistance || 0)}</b></div>
          <div class="stat"><small>${t('bestCity')}</small><b>${cityLabel(s.bestCity || 0)}</b></div>
        </div>
      </div>
      <div class="prof-sec">
        <h3>${t('achievements')} · ${Object.keys(p.achievements).length}/${ACHIEVEMENTS.length}</h3>
        <div class="ach-grid">${ach}</div>
      </div>
      <div class="prof-sec">
        <h3>${t('settings')}</h3>
        <div class="toggles">
          <button class="btn small" data-lang>${ICON.globe}${t('language')}: ${getLang().toUpperCase()}</button>
          <button class="btn small" data-music>${ICON.music}${t('music')}: ${audio.musicOn ? 'ON' : 'OFF'}</button>
          <button class="btn small" data-sfx>${ICON.sound}${t('sound')}: ${audio.sfxOn ? 'ON' : 'OFF'}</button>
        </div>
      </div>
      ${p.guest ? '' : `<div class="prof-sec">
        <h3>${t('emailSection')}</h3>
        ${p.secured
          ? `<p style="margin:0"><span class="yellow">✓</span> ${t('emailIsProtected')} <b>${esc(p.email || '')}</b></p>`
          : state.config?.emailEnabled
            ? `<p class="muted" style="margin:0">${t('emailWhy')}</p><div class="inline"><button class="btn small primary" data-protect>${t('emailProtectBtn')}</button></div>`
            : `<p class="muted" style="margin:0">${t('emailDisabled')}</p>`}
        <div class="inline"><button class="btn small ghost" data-logout>${ICON.logout}${t('logout')}</button></div>
      </div>`}
    </div>`;
  const el = sheet(t('profile'), ICON.user, body);
  $('[data-name]', el)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = e.target.n.value.trim();
    const err = $('[data-name-err]', el);
    try {
      setProfile((await api.rename(v)).profile);
      err.textContent = t('saved');
      err.style.color = '#7cf0b0';
    } catch (ex) {
      err.style.color = '';
      err.textContent = ex.code === 'name_taken' ? t('nameTaken') : t('badName');
    }
  });
  click($('[data-lang]', el), () => {
    setLang(getLang() === 'lt' ? 'en' : 'lt');
    renderer.lang = getLang();
    renderer.scenery.cache.clear();
    applyStaticTexts();
    profileScreen();
  });
  click($('[data-music]', el), () => {
    audio.setMusic(!audio.musicOn);
    profileScreen();
  });
  click($('[data-sfx]', el), () => {
    audio.setSfx(!audio.sfxOn);
    profileScreen();
  });
  click($('[data-protect]', el), () => protectAccount(profileScreen));
  click($('[data-logout]', el), async () => {
    if (!confirm(p.secured ? t('logoutConfirmSecured') : t('logoutConfirm'))) return;
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setProfile(null);
    onboardScreen();
  });
}

// ---------------------------------------------------------------------------
// Birthday
// ---------------------------------------------------------------------------
function birthdayScreen() {
  state.screen = 'birthday';
  clearPortraits();
  audio.startMusic('menu');
  const el = show(`
    <div class="overlay">
      <div class="panel bday">
        <canvas></canvas>
        <h1>${t('bdayTitle')}</h1>
        <p>${t('bdayText')}</p>
        <p class="yellow" style="margin:0">${ICON.cake.replace('<svg', '<svg style="width:20px;height:20px;vertical-align:-4px"')} ${t('bdayGift')}</p>
        <div class="row"><button class="btn primary big" data-go>${t('bdayGo')}</button></div>
      </div>
    </div>`, { shadeMode: 'full' });
  stopPortraits.push(portrait($('canvas', el), 'birthday', { cheer: true }));
  const conf = setInterval(() => renderer.fx.confetti(renderer.camX + (renderer.W / renderer.ppm) * Math.random(), 9, 25, 4), 900);
  stopPortraits.push(() => clearInterval(conf));
  click($('[data-go]', el), async () => {
    if (!state.profile.guest && state.profile.cosmetics.equipped !== 'birthday') {
      try {
        setProfile((await api.equip('birthday')).profile);
      } catch {
        /* ignore */
      }
    }
    homeScreen();
  });
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------
async function startRun(mode) {
  audio.unlock();
  if (state.busy) return;
  // phones: landscape only; try fullscreen + orientation lock where supported
  if (isTouchDevice()) {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      await screen.orientation?.lock?.('landscape');
    } catch {
      /* not supported (iOS) */
    }
  }
  if (isPortraitTouch()) {
    state.waitingRotate = () => startRun(mode);
    checkOrientation();
    return;
  }
  state.busy = true;
  clearPortraits();
  let run = { mode, seed: params.get('seed') || `local-${Date.now()}`, upgrades: state.profile.upgrades || {}, runId: null };
  const boardReq = state.online && !state.profile.guest ? fetchBoardQuick(mode === 'daily' ? 'daily' : 'all') : Promise.resolve(null);
  if (state.online && !state.profile.guest && !params.has('practice') && !TUNNELS && !(DEBUG && params.has('autoplay'))) {
    try {
      const r = await api.startRun(mode);
      run = { mode, seed: r.seed, upgrades: r.upgrades, runId: r.runId };
    } catch {
      /* play offline */
    }
  }
  const markers = runMarkers(await boardReq);
  state.busy = false;
  state.run = run;
  show('', { shadeMode: 'none' });
  // the touch icons step back once a player knows the controls
  hud.mount(run.upgrades, { faint: (state.profile.stats.runs || 0) >= 10 });
  const tutorial = !prefs.get('tutDone') && !(state.profile.stats.runs > 0) && !params.has('autoplay') && !TUNNELS;
  game.play({
    seed: run.seed,
    upgrades: run.upgrades,
    tutorial,
    startCity: DEBUG ? Number(params.get('city') || 0) : 0,
    startAt: DEBUG && params.has('at') ? Number(params.get('at')) : null,
    autoplay: DEBUG && params.has('autoplay'),
    tunnels: TUNNELS,
    markers,
  });
  if (tutorial) game.sim.helmet = true;
  hud.cityBanner(game.sim.cityIndex);
}

/** Leaderboard for the road flags; never holds up the start of a run for long. */
function fetchBoardQuick(board) {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 1200));
  return Promise.race([api.leaderboard(board, 200).catch(() => null), timeout]);
}

/** Flags along the road: your best distance and the next colleague to pass. */
function runMarkers(board) {
  const out = [];
  const best = state.profile.stats.bestDistance || 0;
  if (best >= 60) out.push({ distance: best, label: t('markerBest'), passText: t('markerBeatBest'), color: '#FFD800' });
  const rival = (board?.entries || [])
    .filter((e) => !e.me && e.distance > best + 25)
    .sort((a, b) => a.distance - b.distance)[0];
  if (rival) out.push({ distance: rival.distance, label: rival.name, passText: t('markerBeat', { name: rival.name }), color: '#9FE3FF' });
  return out;
}

// 3-2-1 before the run continues after a pause (also after switching apps)
let countdownTimer = null;
function resumeGame() {
  if (game.mode !== 'paused') return;
  clearInterval(countdownTimer);
  let n = 3;
  const el = show(`<div class="countdown"><b>${n}</b></div>`, { shadeMode: 'none' });
  const num = $('b', el);
  audio.sfx('tick');
  countdownTimer = setInterval(() => {
    n--;
    if (n > 0) {
      num.textContent = String(n);
      num.style.animation = 'none';
      void num.offsetWidth;
      num.style.animation = '';
      audio.sfx('tick');
      return;
    }
    clearInterval(countdownTimer);
    countdownTimer = null;
    if (game.mode !== 'paused') return;
    if (isPortraitTouch()) return showPause();
    show('', { shadeMode: 'none' });
    game.resume();
  }, 700);
}

function cancelCountdown() {
  if (!countdownTimer) return false;
  clearInterval(countdownTimer);
  countdownTimer = null;
  return true;
}

function onGameEvent(type, ev) {
  switch (type) {
    case 'city':
      // cities with checkpoints announce themselves on arrival (see 'checkpoint')
      if (!ev.first) hud.cityBanner(ev.index);
      break;
    case 'gate':
      hud.gateBanner(ev);
      break;
    case 'checkpoint':
      if (ev.wp === 'city') hud.cityBanner(game.sim.cityIndex);
      else hud.checkpointBanner(game.sim.cityIndex, ev.wp);
      break;
    case 'paused':
      showPause();
      break;
    case 'taskDone':
      break;
    case 'power':
      if (ev.kind === 'drone') hud.banner('🚁', t('droneTitle'), t(isTouchDevice() ? 'droneHintTouch' : 'droneHintKeys'));
      break;
    case 'jet':
      hud.banner('🚀', t('jetTitle'), t(isTouchDevice() ? 'droneHintTouch' : 'droneHintKeys'));
      break;
    case 'tunnelIn':
      hud.banner(`⚡×5 · ${t('tunnelSub')}`, t('tunnelTitle'), t(isTouchDevice() ? 'tunnelHintTouch' : 'tunnelHintKeys'));
      break;
    case 'tunnelCrash':
      hud.banner('💥', t('tunnelCrash'));
      break;
    case 'tunnelOut':
      hud.banner('☀️', t('tunnelOut'));
      break;
    case 'abilityReady':
      hud.banner(t('abTitle'), t(ev.kind === 'shield' ? 'abShieldReady' : 'abJetReady'));
      break;
    default:
  }
}

function showPause() {
  const el = show(`
    <div class="overlay">
      <div class="panel dialog">
        <h2>${t('pause')}</h2>
        <div class="row">
          <button class="btn primary" data-resume>${ICON.play}${t('resume')}</button>
          <button class="btn" data-restart>${ICON.refresh}${t('restart')}</button>
          <button class="btn" data-home>${ICON.home}${t('home')}</button>
        </div>
        <div class="row">
          <button class="btn small" data-music>${ICON.music}${t('music')}: ${audio.musicOn ? 'ON' : 'OFF'}</button>
          <button class="btn small" data-sfx>${ICON.sound}${t('sound')}: ${audio.sfxOn ? 'ON' : 'OFF'}</button>
        </div>
        <div class="muted">${isTouchDevice() ? t('controlsTouch') : t('controlsKeys')}</div>
      </div>
    </div>`, { shadeMode: 'none' });
  click($('[data-resume]', el), resumeGame);
  click($('[data-restart]', el), () => {
    abandonRun();
    startRun(state.run?.mode || 'normal');
  });
  click($('[data-home]', el), () => {
    abandonRun();
    homeScreen();
  });
  click($('[data-music]', el), () => {
    audio.setMusic(!audio.musicOn);
    showPause();
  });
  click($('[data-sfx]', el), () => {
    audio.setSfx(!audio.sfxOn);
    showPause();
  });
}

/** Leaving mid-run still records the result (it is a legitimate run so far). */
function abandonRun() {
  cancelCountdown();
  if (!game.sim || game.mode === 'over') return;
  const s = game.sim.summary();
  submitRun(s).catch(() => {});
  game.quit();
  hud.unmount();
}

function showSecondChance(cb) {
  let left = 4;
  const el = show(`
    <div class="overlay">
      <div class="panel dialog">
        <h2>${ICON.heart.replace('<svg', '<svg style="width:30px;height:30px;color:#E2364B;vertical-align:-5px"')} ${t('secondChance')}</h2>
        <div class="score-big" data-n>${left}</div>
        <div class="row"><button class="btn primary big" data-yes>${t('continue')}</button><button class="btn" data-no>${t('giveUp')}</button></div>
      </div>
    </div>`, { shadeMode: 'none' });
  let done = false;
  const finish = (yes) => {
    if (done) return;
    done = true;
    clearInterval(timer);
    show('', { shadeMode: 'none' });
    cb(yes);
  };
  const timer = setInterval(() => {
    left--;
    const n = $('[data-n]', el);
    if (n) n.textContent = String(left);
    audio.sfx('tick');
    if (left <= 0) finish(false);
  }, 1000);
  click($('[data-yes]', el), () => finish(true));
  click($('[data-no]', el), () => finish(false));
}

async function submitRun(summary) {
  const run = state.run;
  if (!run?.runId) return null;
  run.submitted = true;
  return api.finishRun(run.runId, summary);
}

async function onRunOver(info) {
  prefs.set('tutDone', true);
  hud.hint(null);
  const s = info.summary;
  const p = state.profile;
  const prevBest = p.stats.bestScore || 0;
  const localBest = s.score > prevBest;
  const causeText = deathText(info);
  const tip = deathTip(info);
  const goals = [];
  if (info.next) goals.push(t('goalNext', { place: `${info.next.flag} ${esc(L(info.next.name))}`, dist: fmtDist(info.next.meters) }));
  setTimeout(() => hud.unmount(), 50);
  const el = show(`
    <div class="overlay">
      <div class="panel dialog over">
        <div class="over-head">
          <h2>${t('runOver')}</h2>
          <div class="cause">${causeText} · ${cityLabel(info.cityIndex)}</div>
          <div class="score-big">${fmtNum(s.score)}</div>
          <div data-record>${localBest && s.score > 0 ? `<span class="record">${t('newRecord')}</span>` : ''}</div>
          ${tip ? `<div class="tip">${tip}</div>` : ''}
        </div>
        <div class="stats-grid">
          <div class="stat"><small>${t('distance')}</small><b>${fmtDist(s.distance)}</b></div>
          <div class="stat"><small>${t('reached')}</small><b>${cityLabel(info.cityIndex)}</b></div>
          <div class="stat"><small>${t('earned')}</small><b data-energy>⚡ ${fmtNum(info.energy)}</b></div>
          <div class="stat"><small>${t('multiplier')}</small><b>x${s.maxMult}</b></div>
        </div>
        <div class="ranks" data-ranks></div>
        <div class="goals" data-goals>${goalsHtml(goals)}</div>
        <div class="notice" data-notice></div>
        <div class="row">
          <button class="btn primary big" data-again>${ICON.refresh}${t('playAgain')}</button>
        </div>
        <div class="row">
          <button class="btn small" data-shop>${ICON.wrench}${t('shop')}</button>
          <button class="btn small" data-board>${ICON.trophy}${t('board')}</button>
          <button class="btn small" data-home>${ICON.home}${t('home')}</button>
        </div>
      </div>
    </div>`, { shadeMode: 'full' });
  if (localBest && s.score > 0) audio.sfx('record');
  const mode = state.run?.mode || 'normal';
  click($('[data-again]', el), () => startRun(mode));
  click($('[data-shop]', el), () => shopScreen());
  click($('[data-board]', el), () => boardScreen(mode === 'daily' ? 'daily' : 'all'));
  click($('[data-home]', el), () => homeScreen());
  audio.startMusic('menu');

  if (p.guest || !state.run?.runId) {
    if (p.guest) {
      prefs.set('guestRuns', (p.stats.runs || 0) + 1);
      if (localBest) prefs.set('guestBest', s.score);
      p.stats.runs = (p.stats.runs || 0) + 1;
      p.stats.bestScore = Math.max(prevBest, s.score);
    }
    $('[data-notice]', el).textContent = t('notSaved');
    return;
  }
  try {
    const r = await submitRun(s);
    setProfile(r.profile);
    if (!r.accepted) {
      $('[data-notice]', el).textContent = t('notCounted');
      $('[data-record]', el).innerHTML = '';
      return;
    }
    $('[data-energy]', el).textContent = `⚡ ${fmtNum(r.energy)}`;
    if (r.newBest && !localBest) {
      $('[data-record]', el).innerHTML = `<span class="record">${t('newRecord')}</span>`;
      audio.sfx('record');
    }
    const pills = [];
    if (r.ranks?.all) pills.push(`<span class="rank-pill">${t('rankAll')}<b>#${r.ranks.all.rank}</b> / ${r.ranks.all.total}</span>`);
    if (r.ranks?.week) pills.push(`<span class="rank-pill">${t('rankWeek')}<b>#${r.ranks.week.rank}</b></span>`);
    if (r.ranks?.daily) pills.push(`<span class="rank-pill">${t('rankDaily')}<b>#${r.ranks.daily.rank}</b></span>`);
    $('[data-ranks]', el).innerHTML = pills.join('');
    const all = r.ranks?.all;
    if (all?.above) goals.push(t('goalRank', { rank: all.rank - 1, name: esc(all.above.name), pts: fmtNum(Math.max(1, all.above.score - all.score + 1)) }));
    else if (all?.rank === 1) goals.push(t('goalTop'));
    const shop = shopGoal(r.profile);
    if (shop) goals.push(shop);
    $('[data-goals]', el).innerHTML = goalsHtml(goals);
    maybeSuggestProtect(el);
    r.unlocked?.forEach((id, i) =>
      setTimeout(() => {
        const a = ACHIEVEMENT_BY_ID[id];
        toast(`${L(a)} · ⚡${a.reward}`, t('achievement'));
        audio.sfx('achievement');
      }, 600 + i * 900),
    );
  } catch {
    $('[data-notice]', el).textContent = t('notSaved');
  }
}

const HIT_TIP = {
  cone: 'jump', barrier: 'jump', drum: 'jump', rollDrum: 'jump', cable: 'jump', crate: 'jump', dropLoad: 'jump', quad: 'quad',
  stack: 'double', container: 'double',
  beam: 'slide', rack: 'slide', birds: 'slide',
  tunnelWall: 'turn',
};

function deathText(info) {
  if (info.cause === 'fall') return t('fell');
  const key = `hit_${info.kind}`;
  const txt = t(key);
  return txt === key ? t('crashed') : txt;
}

function deathTip(info) {
  const kind = info.cause === 'fall' ? 'fall' : HIT_TIP[info.kind];
  if (!kind) return '';
  if (kind === 'fall' || isTouchDevice()) return t(`tip_${kind}`);
  return t(`tip_${kind}Keys`);
}

function goalsHtml(goals) {
  if (!goals.length) return '';
  return `<small>${t('goalsTitle')}</small><ul>${goals.map((g) => `<li>${g}</li>`).join('')}</ul>`;
}

/** Cheapest next upgrade: either buyable now or how much energy is still missing. */
function shopGoal(p) {
  if (!p || p.guest) return '';
  let best = null;
  for (const u of UPGRADES) {
    const level = p.upgrades?.[u.id] || 0;
    if (level >= u.costs.length) continue;
    const cost = u.costs[level];
    if (!best || cost < best.cost) best = { u, cost };
  }
  if (!best) return '';
  if (p.energy >= best.cost) return t('goalBuy', { item: esc(L(best.u)) });
  return t('goalSave', { item: esc(L(best.u)), n: fmtNum(best.cost - p.energy) });
}

/** After a few saved runs, gently suggest verifying an email (snoozable for 7 days). */
function maybeSuggestProtect(el) {
  const p = state.profile;
  if (!p || p.guest || p.secured || !state.config?.emailEnabled) return;
  if ((p.stats.runs || 0) < 3) return;
  if (Date.now() < prefs.get('protectSnooze', 0)) return;
  const box = $('[data-notice]', el);
  box.innerHTML = `<div class="protect-tip"><b>${t('protectTitle')}</b> ${t('protectText')}
    <div class="inline"><button class="btn small primary" data-protect>${t('emailProtectBtn')}</button><button class="btn small ghost" data-later>${t('later')}</button></div></div>`;
  click($('[data-protect]', box), () => protectAccount(() => (box.innerHTML = '')));
  click($('[data-later]', box), () => {
    prefs.set('protectSnooze', Date.now() + 7 * 86400000);
    box.innerHTML = '';
  });
}

// ---------------------------------------------------------------------------
if ('serviceWorker' in navigator && !DEBUG && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

boot();

// expose for automated browser tests
window.__mt = { game, state, renderer, startRun, homeScreen };
