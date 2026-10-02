// Parallax background: sky, far skyline with landmarks, mid buildings, near street
// props, the walkable ground with a utility cross-section, and day/night lighting.
import { CITIES, cityStart, cityLength, cityAt } from '/shared/config.js';
import { createRng } from '/shared/rng.js';
import { SKY, THEMES } from './palette.js';
import { LANDMARKS, DEFAULT_LANDMARK, makeG, landmarkColors } from './landmarks.js';
import {
  makeBuilding, buildingSize, drawBuilding, drawMtTower, MT_TOWER, drawCrane, CRANE,
  drawBillboard, BILLBOARD, drawTree, treeSize, drawLamp, LAMP, drawHoarding, FENCE,
} from './buildings.js';
import { SpriteCache, mix, shade, rgba, smooth, clamp } from './util.js';

const LAYERS = {
  far: { f: 0.08, unit: 1 / 26, base: 0.655 },
  mid: { f: 0.24, unit: 1 / 19, base: 0.735 },
  near: { f: 0.55, unit: 1 / 12.5, base: 0.79 },
};

export const GROUND_FRAC = 0.8;

function cityMeta(i) {
  const c = CITIES[i % CITIES.length];
  return { city: c, theme: THEMES[c.theme] || THEMES.baltic, sky: SKY[c.sky] || SKY.noon };
}

function lerpSky(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const o = {};
  for (const k of Object.keys(a)) {
    const va = a[k];
    const vb = b[k] ?? va;
    if (typeof va === 'number') o[k] = va + (vb - va) * t;
    else if (typeof va === 'string' && va.startsWith('#')) o[k] = mix(va, vb, t);
    else o[k] = t < 0.5 ? va : vb;
  }
  return o;
}

export class Scenery {
  constructor() {
    this.cache = new SpriteCache(150);
    this.gen = new Map();
    this.W = 0;
    this.H = 0;
    this.lang = 'lt';
    this.quality = 1;
  }

  resize(W, H) {
    if (W === this.W && H === this.H) return;
    this.W = W;
    this.H = H;
    this.cache.clear();
    this.stars = null;
  }

  /** Sky preset blended across city boundaries. */
  skyAt(x) {
    const ca = cityAt(x);
    const a = cityMeta(ca.index).sky;
    const b = cityMeta(ca.index + 1).sky;
    const k = smooth(clamp((ca.progress - 0.78) / 0.22, 0, 1));
    return lerpSky(a, b, k);
  }

  // -------------------------------------------------------------------------
  // Deterministic decoration per city & layer
  // -------------------------------------------------------------------------
  elements(i, layer) {
    const key = `${i}:${layer}`;
    let els = this.gen.get(key);
    if (els) return els;
    const { city, theme } = cityMeta(i);
    const L = LAYERS[layer];
    const u0 = cityStart(i) * L.f;
    const u1 = (cityStart(i) + cityLength(i)) * L.f;
    const r = createRng(`decor|${city.id}|${layer}|${Math.floor(i / CITIES.length)}`);
    els = [];
    if (layer === 'far') {
      // landmarks evenly spread + filler skyline
      const lms = city.landmarks;
      lms.forEach((id, j) => {
        const lm = LANDMARKS[id] || DEFAULT_LANDMARK;
        const u = u0 + ((j + 0.5) / lms.length) * (u1 - u0) - lm.w / 2;
        els.push({ kind: 'landmark', id, u, w: lm.w, h: lm.h });
      });
      let u = u0;
      while (u < u1) {
        const w = r.range(1.6, 4.2);
        els.push({ kind: 'filler', u, w, h: r.range(1.6, 4.8), tone: r.range(-0.08, 0.08), win: r.chance(0.6) });
        u += w + r.range(-0.4, 0.3);
      }
    } else if (layer === 'mid') {
      let u = u0;
      let n = 0;
      const mtAt = [0.3, 0.78].map((f) => u0 + f * (u1 - u0));
      const craneAt = u0 + r.range(0.45, 0.65) * (u1 - u0);
      let craneDone = false;
      while (u < u1) {
        if (mtAt.length && u >= mtAt[0]) {
          mtAt.shift();
          els.push({ kind: 'mt', u, w: MT_TOWER.w, h: MT_TOWER.h });
          u += MT_TOWER.w + 0.6;
          continue;
        }
        if (!craneDone && u >= craneAt) {
          craneDone = true;
          els.push({ kind: 'crane', u: u - 2, w: CRANE.w, h: CRANE.h, behind: true });
        }
        const b = makeBuilding(theme, `${city.id}|b|${n++}|${Math.floor(i / CITIES.length)}`);
        const sz = buildingSize(b);
        els.push({ kind: 'building', u, w: sz.w, h: sz.h, b });
        u += sz.w + r.range(0.1, 0.9);
      }
    } else {
      let u = u0 + 1;
      let n = 0;
      const boardAt = u0 + 0.5 * (u1 - u0);
      let boardDone = false;
      while (u < u1) {
        if (!boardDone && u >= boardAt) {
          boardDone = true;
          els.push({ kind: 'billboard', u, w: BILLBOARD.w, h: BILLBOARD.h });
          u += BILLBOARD.w + 1.5;
          continue;
        }
        const roll = r.next();
        if (roll < 0.07 && !(els.length && els[els.length - 1].kind === 'hoarding')) {
          els.push({ kind: 'hoarding', u, w: FENCE.w, h: FENCE.h });
          u += FENCE.w + 0.8;
        } else if (roll < 0.55 && theme.tree !== 'none') {
          const ts = treeSize(theme.tree);
          els.push({ kind: 'tree', u, w: ts.w, h: ts.h, seed: `${city.id}t${n++}` });
          u += ts.w + r.range(0.5, 2.5);
        } else if (roll < 0.7) {
          els.push({ kind: 'bench', u, w: 2.2, h: 1.0 });
          u += 3.2;
        } else if (city.theme === 'port' && roll < 0.85) {
          els.push({ kind: 'bollard', u, w: 1.2, h: 0.9 });
          u += 2.4;
        } else {
          u += r.range(1, 3);
        }
        // lamps on a regular rhythm
        const lampU = Math.ceil(u / 9) * 9;
        if (lampU < u + 1 && lampU < u1) els.push({ kind: 'lamp', u: lampU, w: LAMP.w, h: LAMP.h });
      }
      for (let lu = Math.ceil(u0 / 9) * 9; lu < u1; lu += 9) els.push({ kind: 'lamp', u: lu, w: LAMP.w, h: LAMP.h });
      els.sort((a, b) => a.u - b.u);
    }
    if (this.gen.size > 40) this.gen.delete(this.gen.keys().next().value);
    this.gen.set(key, els);
    return els;
  }

  // -------------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------------
  drawSky(ctx, sky, t, camX) {
    const { W, H } = this;
    const hor = H * LAYERS.far.base;
    const g = ctx.createLinearGradient(0, 0, 0, hor);
    g.addColorStop(0, sky.top);
    g.addColorStop(0.55, sky.mid);
    g.addColorStop(1, sky.hor);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, hor + 2);
    // stars
    if (sky.night > 0.2) {
      if (!this.stars) {
        const r = createRng('stars');
        this.stars = Array.from({ length: 90 }, () => [r.next(), r.next() * 0.6, r.range(0.5, 1.6), r.next() * 6]);
      }
      ctx.fillStyle = '#FFFFFF';
      for (const [x, y, s, p] of this.stars) {
        ctx.globalAlpha = (sky.night - 0.2) * (0.55 + 0.45 * Math.sin(t * 2 + p));
        ctx.fillRect(x * W, y * hor, s * (H / 600), s * (H / 600));
      }
      ctx.globalAlpha = 1;
    }
    // sun / moon
    const sx = sky.sunX * W;
    const sy = sky.sunY * H;
    const sr = sky.sunR * H;
    const glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 5);
    glow.addColorStop(0, rgba(sky.sun, sky.moon ? 0.35 : 0.65));
    glow.addColorStop(1, rgba(sky.sun, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(sx - sr * 5, sy - sr * 5, sr * 10, sr * 10);
    ctx.fillStyle = sky.sun;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    if (sky.moon) {
      ctx.fillStyle = rgba(sky.top, 0.9);
      ctx.beginPath();
      ctx.arc(sx + sr * 0.45, sy - sr * 0.2, sr * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
    // clouds
    const cw = W * 0.28;
    const span = W + cw * 2;
    for (let i = 0; i < 6; i++) {
      const r = createRng(`cloud${i}`);
      const speed = 0.02 + r.next() * 0.02;
      const x = ((((r.next() * span - camX * speed * (H / 26) - t * 4 * (1 + i * 0.2)) % span) + span) % span) - cw;
      const y = (0.06 + r.next() * 0.32) * hor;
      const s = 0.6 + r.next() * 0.7;
      const spr = this.cache.get(`cloud${i}:${Math.round(H)}`, cw * s, cw * s * 0.38, (c) => drawCloud(c, cw * s, cw * s * 0.38, i));
      ctx.globalAlpha = 0.85 - sky.night * 0.45;
      ctx.drawImage(spr.canvas, x, y);
      ctx.globalAlpha = 1;
    }
  }

  drawFar(ctx, camX, sky, em = false) {
    const { W, H } = this;
    const L = LAYERS.far;
    const unit = H * L.unit;
    const base = H * L.base;
    const camU = camX * L.f;
    const uMin = camU - 15;
    const uMax = camU + W / unit + 2;
    const cA = cityAt(Math.max(0, uMin / L.f)).index;
    const cB = cityAt(Math.max(0, uMax / L.f)).index;
    for (let i = cA; i <= cB; i++) {
      const { theme } = cityMeta(i);
      const col = theme.farTone;
      const els = this.elements(i, 'far');
      if (!em) {
        for (const e of els) {
          if (e.kind !== 'filler') continue;
          if (e.u + e.w < uMin || e.u > uMax) continue;
          const x = (e.u - camU) * unit;
          const h = e.h * unit;
          ctx.fillStyle = shade(col, e.tone - 0.04);
          ctx.fillRect(Math.round(x), Math.round(base - h), Math.ceil(e.w * unit) + 1, Math.ceil(h) + 1);
          if (e.win) {
            ctx.fillStyle = rgba(shade(col, -0.25), 0.5);
            for (let wy = base - h + unit * 0.4; wy < base - unit * 0.3; wy += unit * 0.55) {
              for (let wx = x + unit * 0.3; wx < x + e.w * unit - unit * 0.3; wx += unit * 0.5) ctx.fillRect(wx, wy, unit * 0.2, unit * 0.22);
            }
          }
        }
      }
      for (const e of els) {
        if (e.kind !== 'landmark') continue;
        if (e.u + e.w < uMin || e.u > uMax) continue;
        const lm = LANDMARKS[e.id] || DEFAULT_LANDMARK;
        if (em && !lm.lights) continue;
        const sc = this.quality < 1 ? 0.75 : 1;
        const pad = 4;
        const spr = this.cache.get(`lm:${e.id}:${col}:${em ? 1 : 0}:${Math.round(unit)}`, lm.w * unit * sc, lm.h * unit * sc, (c) => {
          c.save();
          c.translate(0, lm.h * unit * sc);
          c.scale(unit * sc, -unit * sc);
          const g = makeG(c, landmarkColors(col));
          if (em) lm.lights(g);
          else lm.draw(g);
          c.restore();
        }, pad);
        const x = (e.u - camU) * unit;
        ctx.drawImage(spr.canvas, Math.round(x - pad / sc), Math.round(base - lm.h * unit - pad / sc), spr.canvas.width / sc, spr.canvas.height / sc);
      }
    }
    if (!em) {
      // atmospheric haze toward the horizon
      const hz = ctx.createLinearGradient(0, base - H * 0.3, 0, base);
      hz.addColorStop(0, rgba(sky.haze, 0));
      hz.addColorStop(1, rgba(sky.haze, 0.45));
      ctx.fillStyle = hz;
      ctx.fillRect(0, base - H * 0.3, W, H * 0.3);
      // band below the skyline
      const midBase = H * LAYERS.mid.base;
      ctx.fillStyle = mix(sky.haze, '#55606B', 0.55);
      ctx.fillRect(0, base, W, midBase - base + 1);
    }
  }

  drawMid(ctx, camX, em = false) {
    const { W, H } = this;
    const L = LAYERS.mid;
    const unit = H * L.unit;
    const base = H * L.base;
    const camU = camX * L.f;
    const uMin = camU - 16;
    const uMax = camU + W / unit + 1;
    const cA = cityAt(Math.max(0, uMin / L.f)).index;
    const cB = cityAt(Math.max(0, uMax / L.f)).index;
    const sc = this.quality < 1 ? 0.7 : 0.85;
    for (const pass of [true, false]) {
      for (let i = cA; i <= cB; i++) {
        for (const e of this.elements(i, 'mid')) {
          if (!!e.behind !== pass) continue;
          if (e.u + e.w < uMin || e.u > uMax) continue;
          const x = Math.round((e.u - camU) * unit);
          const key = e.kind === 'building' ? e.b.seed : e.kind;
          const spr = this.cache.get(`mid:${key}:${em ? 1 : 0}:${Math.round(unit)}`, e.w * unit * sc, e.h * unit * sc, (c) => {
            const s = unit * sc;
            if (e.kind === 'building') drawBuilding(c, e.b, s, em);
            else if (e.kind === 'mt') drawMtTower(c, s, em);
            else if (e.kind === 'crane') drawCrane(c, s, em);
          });
          ctx.drawImage(spr.canvas, x - spr.pad / sc, Math.round(base - e.h * unit) - spr.pad / sc, spr.canvas.width / sc, spr.canvas.height / sc);
        }
      }
    }
    if (!em) {
      // back street between mid buildings and the near layer
      const nearBase = H * LAYERS.near.base;
      const { theme } = cityMeta(cityAt(camX + 10).index);
      ctx.fillStyle = shade(theme.pavement, -0.1);
      ctx.fillRect(0, base, W, H * 0.012);
      ctx.fillStyle = theme.road;
      ctx.fillRect(0, base + H * 0.012, W, nearBase - base);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      const du = H * 0.06;
      const off = (camX * 0.4 * (H / 14)) % (du * 2);
      for (let x = -off; x < W; x += du * 2) ctx.fillRect(x, base + (nearBase - base) * 0.55, du, H * 0.004);
    }
  }

  drawNear(ctx, camX, em = false, nightness = 0) {
    const { W, H } = this;
    const L = LAYERS.near;
    const unit = H * L.unit;
    const base = H * L.base;
    const camU = camX * L.f;
    const uMin = camU - 10;
    const uMax = camU + W / unit + 1;
    const cA = cityAt(Math.max(0, uMin / L.f)).index;
    const cB = cityAt(Math.max(0, uMax / L.f)).index;
    for (let i = cA; i <= cB; i++) {
      const { theme, city } = cityMeta(i);
      for (const e of this.elements(i, 'near')) {
        if (e.u + e.w < uMin || e.u > uMax) continue;
        if (em && !['lamp', 'billboard'].includes(e.kind)) continue;
        const x = Math.round((e.u - camU) * unit);
        let key = e.kind;
        if (e.kind === 'tree') key = `tree:${theme.tree}:${e.seed}`;
        if (e.kind === 'lamp') key = `lamp:${city.theme === 'nordic' || city.theme === 'port' ? 'modern' : 'classic'}`;
        if (e.kind === 'billboard') key = `bb:${this.lang}:${this.birthday ? 1 : 0}`;
        const spr = this.cache.get(`near:${key}:${em ? 1 : 0}:${Math.round(unit)}`, e.w * unit, e.h * unit, (c) => {
          const s = unit;
          switch (e.kind) {
            case 'tree':
              return drawTree(c, theme.tree, s, e.seed);
            case 'lamp':
              return drawLamp(c, s, em, city.theme === 'nordic' || city.theme === 'port' ? 'modern' : 'classic');
            case 'hoarding':
              c.translate(0, (e.h - FENCE.h) * s);
              return drawHoarding(c, s, em);
            case 'billboard': {
              const lt = this.lang === 'lt';
              const t1 = this.birthday ? (lt ? 'SU GIMTADIENIU, MINDAUGAI!' : 'HAPPY BIRTHDAY, MINDAUGAS!') : lt ? 'ENERGIJA EUROPAI' : 'ENERGY FOR EUROPE';
              const t2 = lt ? 'MT GROUP · EPC RANGOVAS NUO 2008' : 'MT GROUP · EPC CONTRACTOR SINCE 2008';
              return drawBillboard(c, s, em, t1, t2);
            }
            case 'bench':
              return drawBench(c, s);
            case 'bollard':
              return drawBollard(c, s);
            default:
          }
        }, e.kind === 'lamp' ? Math.ceil(unit * 1.2) : 2);
        ctx.drawImage(spr.canvas, x - spr.pad, Math.round(base - e.h * unit) - spr.pad);
      }
    }
    void nightness;
  }

  /** Walkable surface + utility cross-section. pits: [{x, w}] in world meters. */
  drawGround(ctx, camX, ppm, groundY, theme, pits, t) {
    const { W, H } = this;
    const top = groundY;
    const sw = Math.max(4, 0.26 * ppm);
    // sidewalk
    ctx.fillStyle = theme.pavement;
    ctx.fillRect(0, top, W, sw);
    ctx.fillStyle = shade(theme.pavement, 0.12);
    ctx.fillRect(0, top, W, Math.max(2, sw * 0.18));
    ctx.fillStyle = shade(theme.pavement, -0.18);
    const tile = ppm * 1.0;
    const off = (camX * ppm) % tile;
    for (let x = -off; x < W; x += tile) ctx.fillRect(Math.round(x), top + sw * 0.18, Math.max(1, ppm * 0.02), sw * 0.82);
    // curb
    ctx.fillStyle = shade(theme.pavement, -0.3);
    ctx.fillRect(0, top + sw, W, Math.max(2, ppm * 0.06));
    // soil cross-section
    const soilTop = top + sw + ppm * 0.06;
    const soil = '#7A5C43';
    const g = ctx.createLinearGradient(0, soilTop, 0, H);
    g.addColorStop(0, '#8B6B4E');
    g.addColorStop(1, '#5A4231');
    ctx.fillStyle = g;
    ctx.fillRect(0, soilTop, W, H - soilTop);
    // pebbles
    const pr = createRng('pebbles');
    const tw = ppm * 6;
    const poff = (camX * ppm) % tw;
    ctx.fillStyle = 'rgba(40,28,18,0.25)';
    for (let k = 0; k < 14; k++) {
      const px = pr.next() * tw;
      const py = soilTop + pr.next() * (H - soilTop);
      const s = pr.range(1.5, 4) * (ppm / 60);
      for (let x = px - poff - tw; x < W + tw; x += tw) ctx.fillRect(x, py, s * 2, s);
    }
    // utilities: cable, gas pipe, water pipe
    const lines = [
      [0.62, 0.05, '#2B2D31', '#F07A1A'],
      [1.0, 0.13, '#F2C200', '#B89000'],
      [1.55, 0.11, '#3F78B5', '#2A5486'],
    ];
    for (const [d, r, col, dark] of lines) {
      const y = top + d * ppm;
      if (y > H) continue;
      ctx.fillStyle = col;
      ctx.fillRect(0, y - r * ppm, W, r * 2 * ppm);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(0, y - r * ppm * 0.6, W, r * ppm * 0.35);
      ctx.fillStyle = dark;
      const step = ppm * 4;
      const o = (camX * ppm) % step;
      for (let x = -o; x < W; x += step) ctx.fillRect(x, y - r * ppm - 1, ppm * 0.12, r * 2 * ppm + 2);
    }
    // pits (cut through everything)
    for (const p of pits) {
      const x0 = (p.x - camX) * ppm;
      const x1 = (p.x + p.w - camX) * ppm;
      if (x1 < -20 || x0 > W + 20) continue;
      ctx.fillStyle = shade(soil, -0.55);
      ctx.fillRect(x0, top, x1 - x0, H - top);
      const pg = ctx.createLinearGradient(0, top, 0, H);
      pg.addColorStop(0, 'rgba(0,0,0,0.1)');
      pg.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = pg;
      ctx.fillRect(x0, top, x1 - x0, H - top);
      // walls
      ctx.fillStyle = shade(soil, -0.25);
      ctx.fillRect(x0, top, ppm * 0.08, H - top);
      ctx.fillRect(x1 - ppm * 0.08, top, ppm * 0.08, H - top);
      // cut pipe ends
      for (const [d, r, col] of lines) {
        const y = top + d * ppm;
        ctx.fillStyle = col;
        ctx.fillRect(x0, y - r * ppm, ppm * 0.18, r * 2 * ppm);
        ctx.fillRect(x1 - ppm * 0.18, y - r * ppm, ppm * 0.18, r * 2 * ppm);
      }
      // water glint at the bottom
      ctx.fillStyle = `rgba(120,170,210,${0.25 + 0.1 * Math.sin(t * 3)})`;
      ctx.fillRect(x0 + ppm * 0.1, H - ppm * 0.25, x1 - x0 - ppm * 0.2, ppm * 0.08);
    }
  }

  /** Tint everything drawn so far toward the time-of-day colour. */
  tint(ctx, sky, y1, k = 1) {
    if (sky.tintA <= 0.001) return;
    ctx.fillStyle = rgba(sky.tint, sky.tintA * k);
    ctx.fillRect(0, 0, this.W, y1);
  }
}

function drawCloud(c, w, h, seed) {
  const r = createRng(`cl${seed}`);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0.98)');
  g.addColorStop(1, 'rgba(232,238,246,0.9)');
  c.fillStyle = g;
  const n = 6;
  for (let i = 0; i < n; i++) {
    const cx = w * (0.15 + (0.7 * i) / (n - 1));
    const rr = h * r.range(0.3, 0.5) * (1 - Math.abs(i - (n - 1) / 2) / n);
    c.beginPath();
    c.arc(cx, h * 0.62 - rr * 0.3, rr + h * 0.12, 0, Math.PI * 2);
    c.fill();
  }
  c.fillRect(w * 0.12, h * 0.55, w * 0.76, h * 0.3);
}

function drawBench(c, s) {
  c.fillStyle = '#3B4048';
  c.fillRect(0.2 * s, 0.5 * s, 0.1 * s, 0.5 * s);
  c.fillRect(1.9 * s, 0.5 * s, 0.1 * s, 0.5 * s);
  c.fillStyle = '#8A5A34';
  c.fillRect(0, 0.45 * s, 2.2 * s, 0.12 * s);
  c.fillRect(0, 0.05 * s, 2.2 * s, 0.1 * s);
  c.fillRect(0, 0.22 * s, 2.2 * s, 0.1 * s);
  c.fillStyle = '#3B4048';
  c.fillRect(0.15 * s, 0, 0.08 * s, 0.5 * s);
  c.fillRect(1.97 * s, 0, 0.08 * s, 0.5 * s);
}

function drawBollard(c, s) {
  c.fillStyle = '#2E3238';
  c.fillRect(0.35 * s, 0.25 * s, 0.5 * s, 0.65 * s);
  c.beginPath();
  c.ellipse(0.6 * s, 0.25 * s, 0.4 * s, 0.18 * s, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#FFD800';
  c.fillRect(0.35 * s, 0.6 * s, 0.5 * s, 0.08 * s);
}

export { LAYERS };
