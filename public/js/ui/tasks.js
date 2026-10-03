// Site-task mini games shown mid-run. Each resolves with success/failure.
import { t } from '../i18n.js';
import { audio } from '../audio.js';
import { ICON } from './icons.js';

const KINDS = ['wires', 'gauge', 'valves', 'bolts'];
let lastKind = null;

function pickKind() {
  const opts = KINDS.filter((k) => k !== lastKind);
  lastKind = opts[Math.floor(Math.random() * opts.length)];
  return lastKind;
}

/** Shows a task overlay in `root`. Calls done(success) once. */
export function runTask(root, done, forced) {
  const kind = forced || pickKind();
  const titles = { wires: 'taskWires', gauge: 'taskGauge', valves: 'taskValves', bolts: 'taskBolts' };
  const el = document.createElement('div');
  el.className = 'overlay';
  el.innerHTML = `
    <div class="panel task" role="dialog" aria-label="${t('task')}">
      <div class="task-head">${ICON.wrench}<h2>${t('task')}</h2></div>
      <div class="task-sub">${t(titles[kind])}</div>
      <div class="timer"><i></i></div>
      <div class="task-area"><canvas></canvas></div>
    </div>`;
  el.querySelector('.task-head svg').style.cssText = 'width:26px;height:26px;color:#ffb066';
  root.appendChild(el);
  const area = el.querySelector('.task-area');
  const cv = el.querySelector('canvas');
  const sub = el.querySelector('.task-sub');
  const bar = el.querySelector('.timer i');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = area.clientWidth;
  const H = area.clientHeight;
  cv.width = W * dpr;
  cv.height = H * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);

  let finished = false;
  let raf = 0;
  const startT = performance.now();
  const game = GAMES[kind]({ W, H, ctx, sub });
  const limit = game.limit;

  const finish = (ok) => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    const r = document.createElement('div');
    r.className = `task-result ${ok ? 'ok' : 'fail'}`;
    r.textContent = ok ? t('taskOk') : t('taskFail');
    area.appendChild(r);
    setTimeout(() => {
      el.remove();
      done(ok);
    }, 750);
  };

  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (finished) return;
    cv.setPointerCapture?.(e.pointerId);
    let res;
    try {
      res = game.down?.(pos(e));
    } catch (err) {
      console.error('[task]', err);
      res = false;
    }
    if (res !== undefined) finish(res);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!finished) game.move?.(pos(e));
  });
  cv.addEventListener('pointerup', (e) => {
    if (finished) return;
    const res = game.up?.(pos(e));
    if (res !== undefined) finish(res);
  });
  const onKey = (e) => {
    if (finished) return;
    if (e.code === 'Space' || e.code === 'Enter' || /^Digit[1-6]$/.test(e.code)) {
      e.preventDefault();
      const res = game.key?.(e.code);
      if (res !== undefined) finish(res);
    }
  };
  window.addEventListener('keydown', onKey);

  const loop = (now) => {
    const el2 = (now - startT) / 1000;
    const left = Math.min(1, Math.max(0, 1 - (el2 - (game.grace?.() || 0)) / limit));
    bar.style.transform = `scaleX(${left})`;
    let res;
    try {
      res = game.frame(el2);
    } catch (err) {
      console.error('[task]', err);
      return finish(false);
    }
    if (res !== undefined) return finish(res);
    if (left <= 0) return finish(false);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
const COLORS = ['#E2364B', '#3FA9F5', '#FFD800', '#34B37A'];

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}

const GAMES = {
  wires({ W, H, ctx }) {
    const n = 3;
    const order = [0, 1, 2].sort(() => Math.random() - 0.5);
    const left = [0, 1, 2].map((i) => ({ c: i, x: 46, y: H * (0.2 + i * 0.3) }));
    const right = order.map((c, i) => ({ c, x: W - 46, y: H * (0.2 + i * 0.3) }));
    const done = new Set();
    let drag = null;
    let wrongT = 0;
    let penalty = 0;
    const hit = (list, p) => list.find((o) => Math.hypot(o.x - p.x, o.y - p.y) < 34);
    const draw = (time) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#2B2E35';
      rr(ctx, 14, 10, 64, H - 20, 10);
      ctx.fill();
      rr(ctx, W - 78, 10, 64, H - 20, 10);
      ctx.fill();
      for (const c of done) {
        const a = left.find((o) => o.c === c);
        const b = right.find((o) => o.c === c);
        wire(a, b, COLORS[c], 1);
      }
      if (drag) wire(drag.from, drag.to, COLORS[drag.from.c], 0.9);
      for (const o of left) node(o, true);
      for (const o of right) node(o, false);
      if (wrongT > time) {
        ctx.fillStyle = 'rgba(226,54,75,0.18)';
        ctx.fillRect(0, 0, W, H);
      }
    };
    function wire(a, b, col, alpha) {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x, b.y);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function node(o, isLeft) {
      ctx.fillStyle = COLORS[o.c];
      ctx.beginPath();
      ctx.arc(o.x, o.y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = done.has(o.c) ? '#7CF0B0' : '#15171b';
      ctx.stroke();
      ctx.fillStyle = '#15171b';
      ctx.fillRect(isLeft ? o.x - 30 : o.x + 14, o.y - 4, 16, 8);
    }
    return {
      limit: 7,
      grace: () => penalty,
      down(p) {
        const a = hit(left, p);
        if (a && !done.has(a.c)) drag = { from: a, to: { ...p } };
      },
      move(p) {
        if (drag) drag.to = p;
      },
      up(p) {
        if (!drag) return undefined;
        const b = hit(right, p);
        const from = drag.from;
        drag = null;
        if (!b) return undefined;
        if (b.c === from.c) {
          done.add(b.c);
          audio.sfx('good', { n: done.size * 2 });
          if (done.size === n) return true;
        } else {
          audio.sfx('bad');
          wrongT = performance.now() / 1000 + 0.3;
          penalty -= 1;
        }
        return undefined;
      },
      frame() {
        draw(performance.now() / 1000);
        return undefined;
      },
    };
  },

  gauge({ W, H, ctx, sub }) {
    const cx = W / 2;
    const cy = H * 0.9;
    const R = Math.min(W * 0.42, H * 0.78);
    let zone = { c: 0.3 + Math.random() * 0.4, w: 0.2 };
    let hits = 0;
    let misses = 0;
    let speed = 1.25;
    let phase = Math.random() * 6;
    let lastT = 0;
    let flash = 0;
    let flashCol = '';
    const needle = () => (Math.sin(phase) + 1) / 2;
    const press = () => {
      const v = needle();
      if (Math.abs(v - zone.c) <= zone.w / 2) {
        hits++;
        audio.sfx('good', { n: hits * 3 });
        flash = 0.25;
        flashCol = 'rgba(52,179,122,0.3)';
        if (hits >= 3) return true;
        zone = { c: 0.18 + Math.random() * 0.64, w: Math.max(0.1, zone.w - 0.04) };
        speed += 0.35;
      } else {
        misses++;
        audio.sfx('bad');
        flash = 0.25;
        flashCol = 'rgba(226,54,75,0.3)';
        if (misses >= 2) return false;
      }
      sub.textContent = `${'●'.repeat(hits)}${'○'.repeat(3 - hits)}`;
      return undefined;
    };
    sub.textContent = '○○○';
    return {
      limit: 8,
      down: press,
      key: press,
      frame(time) {
        const dt = time - lastT;
        lastT = time;
        phase += dt * speed * 2.2;
        flash = Math.max(0, flash - dt);
        ctx.clearRect(0, 0, W, H);
        if (flash > 0) {
          ctx.fillStyle = flashCol;
          ctx.fillRect(0, 0, W, H);
        }
        // dial
        ctx.lineCap = 'butt';
        ctx.lineWidth = 26;
        ctx.strokeStyle = '#3A3E46';
        ctx.beginPath();
        ctx.arc(cx, cy, R, Math.PI, 0);
        ctx.stroke();
        ctx.strokeStyle = '#34B37A';
        ctx.beginPath();
        ctx.arc(cx, cy, R, Math.PI + (zone.c - zone.w / 2) * Math.PI, Math.PI + (zone.c + zone.w / 2) * Math.PI);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#8D949C';
        for (let i = 0; i <= 10; i++) {
          const a = Math.PI + (i / 10) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * (R - 20), cy + Math.sin(a) * (R - 20));
          ctx.lineTo(cx + Math.cos(a) * (R - 32), cy + Math.sin(a) * (R - 32));
          ctx.stroke();
        }
        const a = Math.PI + needle() * Math.PI;
        ctx.strokeStyle = '#FFD800';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6));
        ctx.stroke();
        ctx.fillStyle = '#FFD800';
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#E6E8EC';
        ctx.font = '800 16px "Barlow Condensed", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('kV', cx, cy - 26);
        return undefined;
      },
    };
  },

  valves({ W, H, ctx, sub }) {
    const n = 4;
    const seq = Array.from({ length: 4 }, () => Math.floor(Math.random() * n));
    const pos = Array.from({ length: n }, (_, i) => ({ x: W * (0.14 + i * 0.24), y: H * 0.52, i }));
    let phase = 'watch';
    let idx = 0;
    let lit = -1;
    let litUntil = 0;
    let watchStart = 0.35;
    const R = Math.min(W * 0.09, H * 0.28);
    let watchEnd = 0;
    let now = 0;
    sub.textContent = t('watch');
    const press = (i, time) => {
      if (phase !== 'input') return undefined;
      lit = i;
      litUntil = time + 0.2;
      if (seq[idx] === i) {
        audio.sfx('good', { n: i * 2 });
        idx++;
        if (idx === seq.length) return true;
      } else {
        audio.sfx('bad');
        return false;
      }
      return undefined;
    };
    return {
      limit: 9,
      grace: () => (phase === 'watch' ? 99 : watchEnd),
      down(p) {
        const v = pos.find((o) => Math.hypot(o.x - p.x, o.y - p.y) < R * 1.25);
        return v ? press(v.i, now) : undefined;
      },
      key(code) {
        const m = /^Digit([1-4])$/.exec(code);
        return m ? press(Number(m[1]) - 1, now) : undefined;
      },
      frame(time) {
        now = time;
        if (phase === 'watch') {
          const k = Math.floor((time - watchStart) / 0.55);
          const within = (time - watchStart) % 0.55 < 0.38;
          if (time >= watchStart && k < seq.length) {
            if (within && lit !== seq[k]) audio.sfx('good', { n: seq[k] * 2 });
            lit = within ? seq[k] : -1;
          } else if (k >= seq.length) {
            phase = 'input';
            lit = -1;
            watchEnd = time;
            sub.textContent = t('yourTurn');
          }
        } else if (time > litUntil) lit = -1;
        ctx.clearRect(0, 0, W, H);
        // pipe
        ctx.fillStyle = '#5A6069';
        ctx.fillRect(0, H * 0.52 - 9, W, 18);
        for (const o of pos) {
          const on = lit === o.i;
          ctx.fillStyle = '#3A3E46';
          ctx.fillRect(o.x - 12, o.y - 4, 24, 30);
          ctx.save();
          ctx.translate(o.x, o.y - R * 0.3);
          ctx.rotate(on ? 0.7 : 0);
          ctx.strokeStyle = on ? '#FFFFFF' : COLORS[o.i];
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.arc(0, 0, R * 0.8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 6;
          for (let s = 0; s < 4; s++) {
            const a = (s * Math.PI) / 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8);
            ctx.stroke();
          }
          ctx.restore();
          if (on) {
            ctx.fillStyle = `${COLORS[o.i]}55`;
            ctx.beginPath();
            ctx.arc(o.x, o.y - R * 0.3, R * 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#9AA3AD';
          ctx.font = '700 14px "Barlow Condensed", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(String(o.i + 1), o.x, H - 12);
        }
        if (phase === 'input') {
          ctx.fillStyle = '#E6E8EC';
          ctx.font = '700 15px "Barlow Condensed", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${idx}/${seq.length}`, 12, 22);
        }
        return undefined;
      },
    };
  },

  bolts({ W, H, ctx, sub }) {
    const need = 6;
    let got = 0;
    const spots = [];
    const cols = 4;
    const rows = 2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) spots.push({ x: W * (0.15 + c * 0.233), y: H * (0.3 + r * 0.42) });
    let active = [];
    const spin = [];
    let lastSpawn = -1;
    const R = Math.min(30, H * 0.15);
    let now = 0;
    sub.textContent = `0/${need}`;
    const spawn = (time) => {
      const free = spots.map((_, i) => i).filter((i) => !active.some((a) => a.i === i));
      const i = free[Math.floor(Math.random() * free.length)];
      active.push({ i, t: time, rot: Math.random() * 3 });
      lastSpawn = time;
    };
    return {
      limit: 6,
      down(p) {
        const time = now;
        const a = active.find((o) => Math.hypot(spots[o.i].x - p.x, spots[o.i].y - p.y) < R * 1.4);
        if (!a) return undefined;
        active = active.filter((o) => o !== a);
        spin.push({ i: a.i, t: time, rot: a.rot });
        got++;
        audio.sfx('good', { n: got * 2 });
        sub.textContent = `${got}/${need}`;
        if (got >= need) return true;
        return undefined;
      },
      frame(time) {
        now = time;
        if (active.length < 2 && time - lastSpawn > 0.25 && got + active.length < need) spawn(time);
        ctx.clearRect(0, 0, W, H);
        // steel plate
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#5E6670');
        g.addColorStop(1, '#3E444C');
        ctx.fillStyle = g;
        rr(ctx, 10, 10, W - 20, H - 20, 12);
        ctx.fill();
        for (const s of spots) {
          ctx.fillStyle = '#2A2E34';
          ctx.beginPath();
          ctx.arc(s.x, s.y, R * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
        const boltAt = (s, rot, loose, k) => {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(rot);
          const sc = loose ? 1.1 + 0.05 * Math.sin(time * 20) : 1;
          ctx.scale(sc, sc);
          ctx.fillStyle = loose ? '#FFD800' : '#C9CED4';
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
          }
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#1E1E1E';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = loose ? '#B89B00' : '#8D949C';
          ctx.beginPath();
          ctx.arc(0, 0, R * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          if (k !== undefined && k < 1) {
            ctx.strokeStyle = `rgba(124,240,176,${1 - k})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(s.x, s.y, R + 6 + k * 14, 0, Math.PI * 2);
            ctx.stroke();
          }
        };
        for (const sp of spin) {
          const k = Math.max(0, Math.min(1, (time - sp.t) / 0.35));
          boltAt(spots[sp.i], sp.rot + k * 4, false, k);
        }
        for (const a of active) boltAt(spots[a.i], a.rot, true);
        return undefined;
      },
    };
  },
};
