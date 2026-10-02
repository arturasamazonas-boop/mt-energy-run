// In-run heads-up display (DOM), banners and tutorial hints.
import { CITIES, powerupDuration } from '/shared/config.js';
import { t, L, fmtNum, fmtDist } from '../i18n.js';
import { ICON } from './icons.js';
import { drawPowerIcon } from '../render/entities.js';
import { isTouchDevice } from '../input.js';

const POWER_KINDS = ['helmet', 'magnet', 'drone', 'excavator', 'double'];
const POWER_COLORS = { magnet: '#E2364B', drone: '#3FA9F5', excavator: '#F5A623', double: '#34B37A', helmet: '#FFD800' };

export class Hud {
  constructor(root, { onPause }) {
    this.root = root;
    this.onPause = onPause;
    this.last = {};
    this.upgrades = {};
  }

  mount(upgrades = {}) {
    this.upgrades = upgrades;
    this.root.hidden = false;
    this.root.innerHTML = `
      <div class="hud-top">
        <div>
          <div class="hud-score"><div class="num" id="h-score">0</div><div class="mult" id="h-mult">x1</div></div>
          <div class="powers" id="h-powers"></div>
        </div>
        <div class="hud-route">
          <div class="names"><span id="h-cur"></span><span class="next" id="h-next"></span></div>
          <div class="bar"><i id="h-bar"></i><b id="h-dot"></b></div>
          <div class="meta"><span id="h-dist">0 m</span><span class="stars" id="h-stars"></span><span><span class="yellow">⚡</span> <span id="h-energy">0</span></span></div>
        </div>
        <div class="hud-right"><button class="icon-btn" id="h-pause" aria-label="${t('pause')}">${ICON.pause}</button></div>
      </div>`;
    this.el = {
      score: this.root.querySelector('#h-score'),
      mult: this.root.querySelector('#h-mult'),
      cur: this.root.querySelector('#h-cur'),
      next: this.root.querySelector('#h-next'),
      bar: this.root.querySelector('#h-bar'),
      dot: this.root.querySelector('#h-dot'),
      dist: this.root.querySelector('#h-dist'),
      stars: this.root.querySelector('#h-stars'),
      energy: this.root.querySelector('#h-energy'),
      powers: this.root.querySelector('#h-powers'),
    };
    this.root.querySelector('#h-pause').addEventListener('click', () => this.onPause());
    this.powerEls = {};
    for (const k of POWER_KINDS) {
      const d = document.createElement('div');
      d.className = 'power';
      d.hidden = true;
      d.innerHTML = `<canvas width="60" height="60"></canvas><svg class="ring" viewBox="0 0 46 46"><circle cx="23" cy="23" r="20" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="4"/><circle class="p" cx="23" cy="23" r="20" fill="none" stroke="${POWER_COLORS[k]}" stroke-width="4" stroke-linecap="round" stroke-dasharray="125.7" stroke-dashoffset="0"/></svg>`;
      const c = d.querySelector('canvas').getContext('2d');
      c.translate(30, 30);
      c.scale(60, -60);
      drawPowerIcon(c, k, 0.36);
      this.powerEls[k] = { el: d, ring: d.querySelector('circle.p') };
      this.el.powers.appendChild(d);
    }
    this.last = {};
  }

  unmount() {
    this.root.hidden = true;
    this.root.innerHTML = '';
  }

  update(s) {
    const e = this.el;
    if (!e) return;
    const l = this.last;
    if (l.score !== s.score) e.score.textContent = fmtNum(s.score);
    if (l.mult !== s.mult || l.double !== s.double) {
      e.mult.textContent = `x${s.mult * (s.double ? 2 : 1)}`;
      e.mult.classList.toggle('double', s.double);
      if (l.mult !== undefined && s.mult > l.mult) {
        e.mult.classList.remove('bump');
        void e.mult.offsetWidth;
        e.mult.classList.add('bump');
      }
    }
    if (l.cityIndex !== s.cityIndex) {
      const c = CITIES[s.cityIndex % CITIES.length];
      const n = CITIES[(s.cityIndex + 1) % CITIES.length];
      e.cur.textContent = `${c.flag} ${L(c.name)}`;
      e.next.textContent = `${L(n.name)} →`;
    }
    const pct = `${(s.progress * 100).toFixed(1)}%`;
    if (l.pct !== pct) {
      e.bar.style.width = pct;
      e.dot.style.left = pct;
    }
    if (l.distance !== s.distance) e.dist.textContent = fmtDist(s.distance);
    if (l.parts !== s.parts || l.cityIndex !== s.cityIndex) {
      e.stars.innerHTML = [0, 1, 2].map((i) => ICON.star.replace('<svg', `<svg class="${i < s.parts ? 'on' : ''}"`)).join('');
    }
    if (l.energy !== s.energy) e.energy.textContent = fmtNum(s.energy);
    for (const k of POWER_KINDS) {
      const p = this.powerEls[k];
      let on;
      let frac = 1;
      if (k === 'helmet') on = s.helmet;
      else {
        on = s.power[k] > 0;
        if (on) frac = s.power[k] / powerupDuration(k, this.upgrades);
      }
      if (p.el.hidden === on) p.el.hidden = !on;
      if (on) p.ring.setAttribute('stroke-dashoffset', String(125.7 * (1 - Math.min(1, frac))));
    }
    Object.assign(l, s, { pct });
  }

  banner(k, v, sub = '', badge = '') {
    const b = document.createElement('div');
    b.className = 'banner';
    b.innerHTML = `<div class="k">${k}</div><div class="v">${v}</div>${sub ? `<div class="s">${sub}</div>` : ''}${badge}`;
    this.root.querySelectorAll('.banner').forEach((x) => x.remove());
    this.root.appendChild(b);
    setTimeout(() => b.remove(), 2700);
  }

  cityBanner(index) {
    const c = CITIES[index % CITIES.length];
    const lap = Math.floor(index / CITIES.length);
    const badge = c.mt ? `<div class="badge"><img src="/assets/mt-emblem.png" alt="">${t('mtSite')}</div>` : '';
    this.banner(`${t('welcomeTo')}${lap ? ` · ${lap + 1}×` : ''}`, `${L(c.name)}`, `${c.flag} ${L(c.country)} · ${L(c.project)}`, badge);
  }

  gateBanner(ev) {
    const stars = [0, 1, 2].map((i) => (i < ev.stars ? '★' : '☆')).join('');
    this.banner(t('projectOnline'), `${stars}`, `+${fmtNum(ev.points)}`);
  }

  hint(kind) {
    this.root.querySelectorAll('.hint, .zone').forEach((x) => x.remove());
    if (!kind) return;
    const touch = isTouchDevice();
    const text = {
      jump: touch ? t('tutJumpTouch') : t('tutJumpKey'),
      slide: touch ? t('tutSlideTouch') : t('tutSlideKey'),
      double: touch ? t('tutDoubleTouch') : t('tutDoubleKey'),
    }[kind];
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = text;
    this.root.appendChild(h);
    if (touch) {
      const z = document.createElement('div');
      z.className = `zone ${kind === 'slide' ? 'left' : 'right'}`;
      z.innerHTML = kind === 'slide' ? ICON.arrowDown : ICON.arrowUp;
      this.root.appendChild(z);
    }
  }
}
