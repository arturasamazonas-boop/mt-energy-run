// Drawing helpers shared by all renderers.

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

export function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Lighten (amt > 0) or darken (amt < 0) a hex colour. */
export function shade(hex, amt) {
  return amt >= 0 ? mix(hex, '#ffffff', amt) : mix(hex, '#000000', -amt);
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/**
 * LRU cache of pre-rendered sprites. `draw(ctx)` receives a context already
 * translated so that (0,0) is the sprite's anchor (pad applied).
 */
export class SpriteCache {
  constructor(max = 260) {
    this.max = max;
    this.map = new Map();
  }
  get(key, w, h, draw, pad = 2) {
    let s = this.map.get(key);
    if (s) {
      this.map.delete(key);
      this.map.set(key, s);
      return s;
    }
    const c = makeCanvas(w + pad * 2, h + pad * 2);
    const ctx = c.getContext('2d');
    ctx.translate(pad, pad);
    draw(ctx);
    s = { canvas: c, pad, w, h };
    this.map.set(key, s);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value);
    return s;
  }
  clear() {
    this.map.clear();
  }
}

/** Draw text that fits a width. */
export function fitText(ctx, text, x, y, maxW, font, size) {
  let s = size;
  ctx.font = `${font.replace('{s}', s)}`;
  while (ctx.measureText(text).width > maxW && s > 6) {
    s -= 1;
    ctx.font = `${font.replace('{s}', s)}`;
  }
  ctx.fillText(text, x, y);
}

export const BRAND_Y = '#FFD800';
export const BRAND_K = '#1E1E1E';
