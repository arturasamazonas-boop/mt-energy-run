// Far-layer city landmarks. Each entry: { w, h, draw(g), lights?(g) } in layer units.
// Drawing uses a y-up coordinate system (0,0 = bottom-left) via the `g` helper.
import { shade, mix } from './util.js';

/** Helper bound to a context that is already flipped (scale(s,-s)). */
export function makeG(ctx, c) {
  const g = {
    ctx,
    c,
    fill(col) {
      ctx.fillStyle = col;
      return g;
    },
    rect(x, y, w, h, col) {
      if (col) ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h);
      return g;
    },
    poly(pts, col) {
      if (col) ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.closePath();
      ctx.fill();
      return g;
    },
    circle(x, y, r, col) {
      if (col) ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      return g;
    },
    ellipse(x, y, rx, ry, col, a0 = 0, a1 = Math.PI * 2) {
      if (col) ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, a0, a1);
      ctx.fill();
      return g;
    },
    dome(x, y, rx, ry, col) {
      // upper half ellipse (y-up space)
      if (col) ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI);
      ctx.fill();
      return g;
    },
    line(pts, col, w) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.stroke();
      return g;
    },
    spire(cx, y, w, h, col) {
      return g.poly([cx - w / 2, y, cx + w / 2, y, cx, y + h], col);
    },
    windows(x, y, w, h, cols, rows, col, ww = 0.5, wh = 0.55) {
      ctx.fillStyle = col;
      const gx = w / cols;
      const gy = h / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) ctx.fillRect(x + i * gx + (gx * (1 - ww)) / 2, y + j * gy + (gy * (1 - wh)) / 2, gx * ww, gy * wh);
      return g;
    },
    arches(x, y, w, h, n, col) {
      ctx.fillStyle = col;
      const gw = w / n;
      for (let i = 0; i < n; i++) {
        const ax = x + i * gw + gw * 0.18;
        const aw = gw * 0.64;
        ctx.beginPath();
        ctx.moveTo(ax, y);
        ctx.lineTo(ax, y + h - aw / 2);
        ctx.arc(ax + aw / 2, y + h - aw / 2, aw / 2, Math.PI, 0, false);
        ctx.lineTo(ax + aw, y);
        ctx.closePath();
        ctx.fill();
      }
      return g;
    },
    wheel(cx, cy, r, col, gondola, spokes = 16, lw = 0.12) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = lw * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.stroke();
      if (gondola) {
        ctx.fillStyle = gondola;
        for (let i = 0; i < spokes; i++) {
          const a = (i / spokes) * Math.PI * 2;
          ctx.fillRect(cx + Math.cos(a) * r - 0.22, cy + Math.sin(a) * r - 0.38, 0.44, 0.34);
        }
      }
      g.circle(cx, cy, r * 0.08, col);
      return g;
    },
  };
  return g;
}

/** Colour set derived from the city's far tone. */
export function landmarkColors(farTone) {
  return {
    base: farTone,
    dark: shade(farTone, -0.16),
    darker: shade(farTone, -0.3),
    light: shade(farTone, 0.16),
    lighter: shade(farTone, 0.3),
    win: shade(farTone, -0.38),
    brick: mix(farTone, '#A2533C', 0.45),
    brickD: mix(farTone, '#7E3D2C', 0.45),
    copper: mix(farTone, '#6FA596', 0.5),
    gold: mix(farTone, '#E2B44C', 0.55),
    white: mix(farTone, '#FFFFFF', 0.55),
    red: mix(farTone, '#C0392B', 0.5),
    green: mix(farTone, '#4E7D4A', 0.5),
    glass: mix(farTone, '#BFD9EA', 0.45),
    water: mix(farTone, '#5D86A6', 0.4),
    yellow: mix(farTone, '#FFD800', 0.55),
  };
}

const PI = Math.PI;

export const LANDMARKS = {
  // ---------------- Vilnius
  gediminas: {
    w: 12, h: 7.6,
    draw(g) {
      const { c } = g;
      g.dome(6, 0, 6.2, 3.1, c.green);
      g.dome(6, 0, 4.2, 2.6, shade(c.green, 0.08));
      g.rect(4.9, 2.6, 2.2, 3.2, c.brick);
      g.rect(6.4, 2.6, 0.7, 3.2, c.brickD);
      for (let i = 0; i < 5; i++) g.rect(4.9 + i * 0.48, 5.8, 0.3, 0.35, c.brick);
      g.windows(5.2, 3.2, 1.6, 2.2, 2, 2, c.win, 0.35, 0.5);
      g.rect(5.95, 6.1, 0.08, 1.5, c.darker);
      g.rect(6.03, 7.2, 1.0, 0.13, '#E8BE2C').rect(6.03, 7.07, 1.0, 0.13, '#2E7D4F').rect(6.03, 6.94, 1.0, 0.13, '#C13A33');
    },
    lights(g) {
      g.rect(5.25, 3.4, 0.4, 0.5, '#FFD58A').rect(6.15, 4.5, 0.4, 0.5, '#FFD58A');
    },
  },
  cathedral: {
    w: 11, h: 7.4,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 8, 4.1, c.white);
      g.rect(0, 0, 8, 0.4, c.light);
      g.poly([1.2, 4.1, 6.8, 4.1, 4, 5.4], c.white);
      g.poly([1.6, 4.25, 6.4, 4.25, 4, 5.15], c.light);
      for (let i = 0; i < 6; i++) g.rect(1.25 + i * 1.03, 0.4, 0.35, 3.5, c.lighter);
      g.rect(1.1, 3.9, 5.8, 0.25, c.light);
      g.rect(3.85, 5.3, 0.3, 0.6, c.dark).rect(1.3, 4.1, 0.25, 0.5, c.dark).rect(6.45, 4.1, 0.25, 0.5, c.dark);
      g.windows(0.3, 0.6, 0.8, 3, 1, 3, c.dark, 0.5, 0.5).windows(7, 0.6, 0.8, 3, 1, 3, c.dark, 0.5, 0.5);
      // belfry
      g.rect(9, 0, 1.6, 4.4, c.white).rect(9.15, 4.4, 1.3, 1.3, c.white).rect(9.3, 5.7, 1.0, 0.9, c.white);
      g.rect(9.5, 4.65, 0.6, 0.8, c.dark).rect(9.6, 5.85, 0.4, 0.55, c.dark);
      g.spire(9.8, 6.6, 0.8, 0.8, c.copper);
    },
  },
  tvtower: {
    w: 3, h: 11.2,
    draw(g) {
      const { c } = g;
      g.poly([0.6, 0, 2.4, 0, 1.75, 1.2, 1.25, 1.2], c.dark);
      g.poly([1.2, 0, 1.8, 0, 1.62, 7.2, 1.38, 7.2], c.light);
      g.ellipse(1.5, 6.9, 0.95, 0.42, c.base);
      g.rect(0.6, 6.85, 1.8, 0.2, c.win);
      g.rect(1.42, 7.2, 0.16, 3.4, c.dark).rect(1.47, 10.6, 0.06, 0.6, c.darker);
      for (let i = 0; i < 6; i++) g.rect(1.38, 7.6 + i * 0.5, 0.24, 0.18, i % 2 ? c.red : c.white);
    },
    lights(g) {
      g.rect(0.7, 6.85, 1.6, 0.18, '#FFD58A').circle(1.5, 11.15, 0.12, '#FF4A3A');
    },
  },
  // ---------------- Klaipėda
  fsru: {
    w: 16, h: 6,
    draw(g) {
      const { c } = g;
      g.rect(-1, 0, 18, 0.5, c.water);
      g.poly([0, 0.3, 15, 0.3, 16, 2, 0.4, 2], mix(c.base, '#2C3E50', 0.5));
      g.rect(0.4, 1.6, 15.2, 0.25, c.red);
      g.rect(0.8, 2, 2.6, 2.2, c.white).rect(1.0, 4.2, 2.2, 0.8, c.white).windows(1, 3.2, 2.2, 0.6, 5, 1, c.win, 0.6, 0.6);
      g.rect(2.4, 5, 0.5, 0.9, c.dark);
      for (let i = 0; i < 4; i++) g.dome(5 + i * 2.6, 2, 1.25, 1.35, c.lighter);
      g.rect(4.2, 2, 10.6, 0.3, c.light);
      g.line([4, 2.6, 15, 2.6], c.dark, 0.06);
      g.rect(14.6, 2, 0.3, 1.8, c.dark);
    },
    lights(g) {
      g.windows(1, 3.2, 2.2, 0.6, 5, 1, '#FFD58A', 0.6, 0.6).circle(14.75, 3.85, 0.12, '#FF4A3A').circle(2.65, 5.95, 0.1, '#FFFFFF');
    },
  },
  portcranes: {
    w: 12, h: 10,
    draw(g) {
      const { c } = g;
      for (const [x, col] of [[0.5, c.red], [6.5, c.base]]) {
        g.line([x, 0, x + 1.4, 6.5, x + 2.8, 0], col, 0.25);
        g.line([x + 3.2, 0, x + 1.8, 6.5], col, 0.25);
        g.rect(x - 1, 6.3, 7.5, 0.5, col);
        g.rect(x + 1.2, 6.8, 0.6, 2.4, col);
        g.line([x + 1.5, 9.2, x - 1, 6.8], col, 0.08).line([x + 1.5, 9.2, x + 6.5, 6.8], col, 0.08);
        g.rect(x + 2, 5.4, 0.9, 0.9, c.dark);
      }
    },
    lights(g) {
      g.circle(2.2, 9.3, 0.12, '#FF4A3A').circle(8.2, 9.3, 0.12, '#FF4A3A');
    },
  },
  meridian: {
    w: 9, h: 8,
    draw(g) {
      const { c } = g;
      g.rect(-0.5, 0, 10, 0.4, c.water);
      g.poly([0, 1.6, 9, 1.6, 8, 0.3, 1, 0.3], c.darker);
      g.rect(0.3, 1.45, 8.4, 0.2, c.white);
      for (const [x, h] of [[2, 6.6], [4.5, 7.6], [7, 6.2]]) {
        g.rect(x - 0.06, 1.6, 0.12, h - 1.6, c.dark);
        for (let i = 0; i < 3; i++) g.poly([x - 1.3 + i * 0.15, 2.6 + i * 1.4, x + 1.3 - i * 0.15, 2.6 + i * 1.4, x + 1.1 - i * 0.15, 3.6 + i * 1.4, x - 1.1 + i * 0.15, 3.6 + i * 1.4], c.lighter);
      }
      g.line([0, 2.2, 2, 6.6, 4.5, 7.6, 7, 6.2, 9, 2.1], c.dark, 0.04);
    },
  },
  // ---------------- Riga
  stpeters: {
    w: 7, h: 11.4,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 7, 3.6, c.brick).poly([0, 3.6, 7, 3.6, 3.5, 5], c.brickD);
      g.windows(0.3, 0.5, 2, 2.6, 2, 1, c.win, 0.4, 0.8).windows(4.7, 0.5, 2, 2.6, 2, 1, c.win, 0.4, 0.8);
      g.rect(2.7, 0, 1.6, 6.4, c.brick).rect(2.9, 5.2, 0.4, 0.8, c.win).rect(3.7, 5.2, 0.4, 0.8, c.win);
      g.rect(2.85, 6.4, 1.3, 0.8, c.copper).ellipse(3.5, 7.4, 0.55, 0.35, c.copper);
      g.rect(3.15, 7.6, 0.7, 0.9, c.copper).ellipse(3.5, 8.6, 0.4, 0.25, c.copper);
      g.spire(3.5, 8.7, 0.6, 2.4, c.copper);
      g.rect(3.47, 11, 0.06, 0.4, c.gold);
    },
  },
  freedom: {
    w: 4, h: 10.4,
    draw(g) {
      const { c } = g;
      g.rect(0.3, 0, 3.4, 0.6, c.light).rect(0.7, 0.6, 2.6, 1.4, c.white).rect(1.0, 2, 2.0, 0.4, c.light);
      g.poly([1.45, 2.4, 2.55, 2.4, 2.35, 8.2, 1.65, 8.2], c.white);
      g.rect(1.6, 8.2, 0.8, 0.25, c.light);
      // Milda
      g.poly([1.75, 8.45, 2.25, 8.45, 2.15, 9.6, 1.85, 9.6], c.copper).circle(2, 9.75, 0.17, c.copper);
      g.line([2.05, 9.5, 2.0, 10.15], c.copper, 0.12);
      g.poly([1.55, 10.1, 2.45, 10.1, 2.0, 10.2], c.copper);
      for (const x of [1.6, 2.0, 2.4]) g.circle(x, 10.25, 0.12, c.gold);
    },
  },
  blackheads: {
    w: 6, h: 8,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 6, 4.2, c.brick);
      g.poly([0, 4.2, 6, 4.2, 5.2, 5.2, 4.6, 5.2, 4.6, 6.2, 3.8, 6.2, 3.8, 7.2, 3.3, 7.2, 3, 8, 2.7, 7.2, 2.2, 7.2, 2.2, 6.2, 1.4, 6.2, 1.4, 5.2, 0.8, 5.2], c.brick);
      g.windows(0.4, 0.6, 5.2, 3.4, 4, 3, c.white, 0.5, 0.6);
      g.windows(1.6, 4.4, 2.8, 1.6, 3, 1, c.win, 0.45, 0.6);
      g.circle(3, 6.6, 0.38, c.gold).circle(3, 6.6, 0.28, c.white);
      g.rect(0, 2.05, 6, 0.12, c.white).rect(0, 4.1, 6, 0.15, c.white);
    },
  },
  // ---------------- Tallinn
  toompea: {
    w: 13, h: 7.5,
    draw(g) {
      const { c } = g;
      g.dome(6.5, 0, 7, 2.2, c.green);
      g.rect(0.5, 1.4, 12, 1.6, c.light);
      for (let i = 0; i < 13; i++) g.rect(0.5 + i * 0.95, 3, 0.5, 0.3, c.light);
      for (const [x, h] of [[1.5, 5], [6, 6], [10.5, 4.6]]) {
        g.rect(x - 0.75, 1.4, 1.5, h - 1.4, c.lighter);
        g.spire(x, h, 1.9, 1.7, c.red);
        g.rect(x - 0.15, h - 1.2, 0.3, 0.5, c.win);
      }
    },
  },
  olaf: {
    w: 4, h: 11.6,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 4, 2.6, c.light).poly([0, 2.6, 4, 2.6, 2, 3.6], c.dark);
      g.rect(1.2, 0, 1.6, 6.2, c.lighter);
      g.windows(1.3, 3, 1.4, 2.8, 1, 2, c.win, 0.35, 0.7);
      g.spire(2, 6.2, 1.7, 5.2, c.copper);
      g.rect(1.97, 11.2, 0.06, 0.4, c.darker);
    },
  },
  fatmargaret: {
    w: 6, h: 5,
    draw(g) {
      const { c } = g;
      g.rect(0.6, 0, 4.8, 3.8, c.lighter);
      g.rect(0.6, 0, 4.8, 0.6, c.light);
      for (let i = 0; i < 6; i++) g.rect(0.6 + i * 0.84, 3.8, 0.5, 0.4, c.lighter);
      g.windows(1, 1, 4, 2.4, 4, 2, c.win, 0.25, 0.5);
      g.poly([5.4, 0, 6, 0, 6, 2.5, 5.4, 3.1], c.light);
    },
  },
  // ---------------- Helsinki
  helsinkicathedral: {
    w: 10, h: 8.6,
    draw(g) {
      const { c } = g;
      g.poly([0, 0, 10, 0, 9, 1.2, 1, 1.2], c.light);
      g.rect(1.5, 1.2, 7, 3.2, c.white);
      for (let i = 0; i < 6; i++) g.rect(3.05 + i * 0.7, 1.2, 0.25, 2.6, c.lighter);
      g.poly([2.8, 3.8, 7.2, 3.8, 5, 4.6], c.lighter);
      g.rect(3.5, 4.4, 3, 1.1, c.white);
      g.dome(5, 5.5, 1.7, 2, c.copper);
      g.rect(4.9, 7.4, 0.2, 0.6, c.gold).circle(5, 8.2, 0.15, c.gold);
      for (const x of [2.1, 7.9]) {
        g.rect(x - 0.5, 4.4, 1, 0.8, c.white).dome(x, 5.2, 0.55, 0.75, c.copper).circle(x, 6.05, 0.1, c.gold);
      }
      g.windows(1.7, 1.6, 1.2, 2.2, 1, 2, c.dark, 0.5, 0.6).windows(7.1, 1.6, 1.2, 2.2, 1, 2, c.dark, 0.5, 0.6);
    },
    lights(g) {
      g.rect(1.5, 1.2, 7, 0.15, 'rgba(255,240,200,0.6)');
    },
  },
  uspenski: {
    w: 8, h: 9,
    draw(g) {
      const { c } = g;
      g.rect(0.3, 0, 7.4, 3.6, c.brick).poly([0.3, 3.6, 7.7, 3.6, 4, 4.4], c.brickD);
      g.windows(0.6, 0.5, 6.8, 2.6, 6, 1, c.win, 0.4, 0.8);
      g.rect(3.1, 3.6, 1.8, 2.6, c.brick);
      const onion = (x, y, r, h) => {
        g.ctx.fillStyle = c.gold;
        g.ctx.beginPath();
        g.ctx.moveTo(x - r, y);
        g.ctx.bezierCurveTo(x - r * 1.3, y + h * 0.6, x - r * 0.2, y + h * 0.7, x, y + h);
        g.ctx.bezierCurveTo(x + r * 0.2, y + h * 0.7, x + r * 1.3, y + h * 0.6, x + r, y);
        g.ctx.fill();
        g.rect(x - 0.03, y + h, 0.06, 0.45, c.gold);
      };
      onion(4, 6.2, 0.75, 1.9);
      for (const x of [1.2, 6.8]) {
        g.rect(x - 0.4, 3.6, 0.8, 1.4, c.brick);
        onion(x, 5, 0.45, 1.1);
      }
    },
  },
  ferriswheel: {
    w: 9, h: 9.8,
    draw(g) {
      const { c } = g;
      g.line([2.5, 0, 4.5, 5, 6.5, 0], c.dark, 0.25);
      g.wheel(4.5, 5, 4.4, c.white, c.base, 18, 0.16);
      g.rect(2, 0, 5, 0.6, c.dark);
    },
    lights(g) {
      g.ctx.strokeStyle = 'rgba(255,220,140,0.85)';
      g.ctx.lineWidth = 0.1;
      g.ctx.beginPath();
      g.ctx.arc(4.5, 5, 4.4, 0, PI * 2);
      g.ctx.stroke();
    },
  },
  // ---------------- Stockholm
  cityhall: {
    w: 13, h: 11,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 13, 3.6, c.brick).windows(0.3, 0.4, 12.4, 2.8, 10, 2, c.win, 0.4, 0.6);
      g.rect(0, 3.6, 13, 0.4, c.brickD);
      g.rect(8.5, 0, 2.6, 8.4, c.brick).windows(8.8, 3.6, 2, 4.4, 2, 4, c.win, 0.35, 0.6);
      g.rect(8.3, 8.4, 3, 0.4, c.brickD);
      g.rect(9.1, 8.8, 1.4, 1.2, c.copper).poly([9.1, 10, 10.5, 10, 9.8, 10.5], c.copper);
      for (const dx of [-0.35, 0, 0.35]) g.circle(9.8 + dx, 10.7, 0.16, c.gold);
    },
  },
  riddarholmen: {
    w: 6, h: 10,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 6, 3, c.brick).poly([0, 3, 6, 3, 3, 4], c.brickD);
      g.rect(2.2, 0, 1.6, 5.4, c.brick);
      g.ctx.strokeStyle = c.darker;
      g.ctx.lineWidth = 0.07;
      g.ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const y = 5.4 + i * 0.55;
        const hw = 0.8 * (1 - i / 9);
        g.ctx.moveTo(3 - hw, y);
        g.ctx.lineTo(3 + hw, y);
        g.ctx.moveTo(3 - hw, y);
        g.ctx.lineTo(3 + 0.8 * (1 - (i + 1) / 9), y + 0.55);
        g.ctx.moveTo(3 + hw, y);
        g.ctx.lineTo(3 - 0.8 * (1 - (i + 1) / 9), y + 0.55);
      }
      g.ctx.moveTo(3, 5.4);
      g.ctx.lineTo(3, 10);
      g.ctx.stroke();
    },
  },
  globe: {
    w: 8, h: 7.4,
    draw(g) {
      const { c } = g;
      g.circle(4, 3.5, 3.6, c.white);
      g.ctx.strokeStyle = c.light;
      g.ctx.lineWidth = 0.06;
      for (let i = 1; i < 6; i++) {
        g.ctx.beginPath();
        g.ctx.ellipse(4, 3.5, 3.6 * Math.sin((i / 6) * PI), 3.6, 0, 0, PI * 2);
        g.ctx.stroke();
      }
      g.rect(0, 0, 8, 0.6, c.light);
    },
    lights(g) {
      g.ctx.fillStyle = 'rgba(255,230,180,0.35)';
      g.ctx.beginPath();
      g.ctx.arc(4, 3.5, 3.6, 0, PI * 2);
      g.ctx.fill();
    },
  },
  // ---------------- Copenhagen
  nyhavn: {
    w: 14, h: 6.4,
    draw(g) {
      const { c } = g;
      const cols = ['#E3A43B', '#C0503A', '#3F6EA8', '#E9D27B', '#7EA36A', '#D0703F', '#9B4A4A'].map((x) => mix(c.base, x, 0.5));
      for (let i = 0; i < 7; i++) {
        const x = i * 2;
        const h = 3.4 + (i % 3) * 0.5;
        g.rect(x, 0, 2, h, cols[i]).poly([x, h, x + 2, h, x + 1, h + 1.1], cols[i]);
        g.windows(x + 0.2, 0.6, 1.6, h - 0.9, 2, 3, c.win, 0.45, 0.55);
      }
      g.rect(-0.5, 0, 15, 0.5, c.water);
      for (const x of [3, 9]) g.line([x, 0.5, x, 5.8], c.darker, 0.08);
    },
    lights(g) {
      for (let i = 0; i < 7; i++) g.rect(i * 2 + 0.45, 1.2, 0.35, 0.4, '#FFD58A');
    },
  },
  christiansborg: {
    w: 11, h: 10,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 11, 4.4, c.light).windows(0.3, 0.5, 10.4, 3.6, 10, 3, c.win, 0.4, 0.55);
      g.rect(0, 4.4, 11, 0.6, c.copper);
      g.rect(4.4, 4.4, 2.2, 2.8, c.light).rect(4.6, 7.2, 1.8, 0.8, c.copper);
      g.spire(5.5, 8, 1.3, 1.8, c.copper);
      for (const dx of [-0.25, 0, 0.25]) g.circle(5.5 + dx, 9.85, 0.12, c.gold);
    },
  },
  windmills: {
    w: 14, h: 9.4,
    draw(g) {
      const { c } = g;
      g.rect(-1, 0, 16, 0.4, c.water);
      for (const [x, h, a] of [[2, 8, 0.4], [7, 6.4, 1.3], [11.5, 7.2, 2.1]]) {
        g.poly([x - 0.18, 0.4, x + 0.18, 0.4, x + 0.08, h, x - 0.08, h], c.white);
        g.rect(x - 0.2, h - 0.1, 0.55, 0.3, c.white);
        for (let i = 0; i < 3; i++) {
          const ang = a + (i * 2 * PI) / 3;
          g.line([x, h + 0.05, x + Math.cos(ang) * (h * 0.3), h + 0.05 + Math.sin(ang) * (h * 0.3)], c.white, 0.14);
        }
        g.rect(x - 0.25, 0.4, 0.5, 0.5, c.yellow);
      }
    },
    lights(g) {
      for (const [x, h] of [[2, 8], [7, 6.4], [11.5, 7.2]]) g.circle(x, h + 0.25, 0.12, '#FF4A3A');
    },
  },
  // ---------------- Hamburg
  elbphilharmonie: {
    w: 12, h: 8.6,
    draw(g) {
      const { c } = g;
      g.rect(-0.5, 0, 13, 0.4, c.water);
      g.rect(0.5, 0.4, 11, 3.6, c.brick).windows(0.8, 0.8, 10.4, 2.8, 12, 3, c.win, 0.35, 0.5);
      g.ctx.fillStyle = c.glass;
      g.ctx.beginPath();
      g.ctx.moveTo(0.3, 4);
      g.ctx.lineTo(0.3, 6.6);
      g.ctx.quadraticCurveTo(1.6, 8.2, 3, 6.8);
      g.ctx.quadraticCurveTo(4.6, 8.8, 6.2, 7.1);
      g.ctx.quadraticCurveTo(8, 8.3, 9.4, 6.9);
      g.ctx.quadraticCurveTo(10.8, 7.8, 11.7, 6.6);
      g.ctx.lineTo(11.7, 4);
      g.ctx.fill();
      g.windows(0.6, 4.2, 10.8, 2.3, 18, 4, c.lighter, 0.5, 0.35);
      g.rect(0.3, 4, 11.4, 0.25, c.light);
    },
    lights(g) {
      g.windows(0.6, 4.2, 10.8, 2.3, 18, 4, 'rgba(255,224,160,0.9)', 0.5, 0.35);
    },
  },
  michel: {
    w: 5, h: 10.6,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 5, 3.2, c.brick).poly([0, 3.2, 5, 3.2, 2.5, 4.2], c.copper);
      g.rect(1.6, 0, 1.8, 6.4, c.brick).windows(1.8, 3.6, 1.4, 2.4, 1, 2, c.win, 0.4, 0.7);
      g.rect(1.7, 6.4, 1.6, 1.0, c.copper).ellipse(2.5, 7.6, 0.75, 0.35, c.copper).rect(2.05, 7.8, 0.9, 0.9, c.copper);
      g.ellipse(2.5, 8.85, 0.5, 0.25, c.copper).spire(2.5, 9, 0.5, 1.4, c.copper);
      g.circle(2.5, 7.0, 0.3, c.gold);
    },
  },
  // ---------------- Amsterdam
  canalhouses: {
    w: 12, h: 6.4,
    draw(g) {
      const { c } = g;
      const cols = ['#7A3E2E', '#5E3326', '#3F3A36', '#9A5A3F', '#6E2F28', '#4A4440'].map((x) => mix(c.base, x, 0.55));
      for (let i = 0; i < 6; i++) {
        const x = i * 2;
        const h = 3.8 + ((i * 7) % 3) * 0.45;
        g.rect(x, 0, 1.9, h, cols[i]);
        if (i % 2) g.poly([x, h, x + 1.9, h, x + 1.4, h + 1.2, x + 0.5, h + 1.2], cols[i]);
        else g.poly([x, h, x + 1.9, h, x + 1.9, h + 0.4, x + 1.5, h + 0.4, x + 1.5, h + 0.8, x + 1.1, h + 0.8, x + 1.1, h + 1.3, x + 0.8, h + 1.3, x + 0.8, h + 0.8, x + 0.4, h + 0.8, x + 0.4, h + 0.4, x, h + 0.4], cols[i]);
        g.windows(x + 0.15, 0.5, 1.6, h - 0.8, 2, 3, c.white, 0.5, 0.55);
      }
      g.rect(-0.5, 0, 13, 0.45, c.water);
    },
    lights(g) {
      for (let i = 0; i < 6; i++) g.rect(i * 2 + 0.35, 1.6, 0.35, 0.45, '#FFD58A');
    },
  },
  windmill: {
    w: 7, h: 8,
    draw(g) {
      const { c } = g;
      g.poly([1.8, 0, 5.2, 0, 4.4, 4.8, 2.6, 4.8], c.dark);
      g.poly([2.4, 4.8, 4.6, 4.8, 3.5, 5.8], c.darker);
      g.rect(3.2, 0, 0.6, 1.2, c.win);
      const cx = 3.5;
      const cy = 4.9;
      for (let i = 0; i < 4; i++) {
        const a = 0.6 + (i * PI) / 2;
        const ex = cx + Math.cos(a) * 3.2;
        const ey = cy + Math.sin(a) * 3.2;
        g.line([cx, cy, ex, ey], c.darker, 0.12);
        const px = -Math.sin(a) * 0.45;
        const py = Math.cos(a) * 0.45;
        g.poly([cx + Math.cos(a) * 0.8, cy + Math.sin(a) * 0.8, ex, ey, ex + px, ey + py, cx + Math.cos(a) * 0.8 + px, cy + Math.sin(a) * 0.8 + py], c.white);
      }
    },
  },
  westerkerk: {
    w: 4, h: 10,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 4, 3, c.brick).rect(1.1, 0, 1.8, 5.6, c.brick).windows(1.3, 3.4, 1.4, 1.8, 1, 1, c.win, 0.4, 0.8);
      g.rect(1.25, 5.6, 1.5, 1.2, c.white).rect(1.4, 6.8, 1.2, 1, c.white).rect(1.55, 7.8, 0.9, 0.7, c.white);
      g.ellipse(2, 8.85, 0.5, 0.45, mix(c.base, '#2F5DA8', 0.55));
      g.circle(2, 9.5, 0.18, c.gold);
    },
  },
  // ---------------- Brussels
  atomium: {
    w: 8, h: 9.6,
    draw(g) {
      const { c } = g;
      const pts = [[4, 8.6], [1.4, 6.2], [6.6, 6.2], [4, 5], [1.4, 3.6], [6.6, 3.6], [4, 2.4], [2.6, 4.9], [5.4, 4.9]];
      g.line([4, 0, 4, 2.4], c.light, 0.35);
      g.line([2.6, 0, 4, 2.4, 5.4, 0], c.light, 0.18);
      const links = [[0, 1], [0, 2], [0, 3], [1, 4], [2, 5], [3, 6], [4, 6], [5, 6], [1, 7], [7, 4], [2, 8], [8, 5], [3, 7], [3, 8]];
      for (const [a, b] of links) g.line([pts[a][0], pts[a][1], pts[b][0], pts[b][1]], c.light, 0.25);
      for (const [x, y] of pts) {
        g.circle(x, y, 0.85, c.lighter);
        g.circle(x - 0.25, y + 0.25, 0.3, c.white);
      }
    },
    lights(g) {
      for (const [x, y] of [[4, 8.6], [1.4, 6.2], [6.6, 6.2], [4, 5], [1.4, 3.6], [6.6, 3.6], [4, 2.4]]) g.circle(x, y, 0.2, '#FFF4D0');
    },
  },
  townhall: {
    w: 10, h: 10.6,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 10, 4, c.light).windows(0.3, 0.5, 9.4, 3.2, 10, 3, c.win, 0.35, 0.6);
      g.poly([0, 4, 10, 4, 9.3, 5, 0.7, 5], c.dark);
      g.rect(4.3, 0, 1.4, 7.4, c.light).windows(4.5, 5.2, 1, 2, 1, 2, c.win, 0.4, 0.6);
      g.rect(4.45, 7.4, 1.1, 0.9, c.light);
      g.spire(5, 8.3, 0.9, 2, c.light);
      g.rect(4.97, 10.3, 0.06, 0.3, c.gold);
      for (let i = 0; i < 9; i++) g.spire(0.6 + i * 1.1, 5, 0.25, 0.6, c.light);
    },
  },
  berlaymont: {
    w: 12, h: 5.6,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 12, 4.6, c.glass);
      g.rect(4, 0, 4, 5.2, c.light);
      for (let y = 0.4; y < 5; y += 0.4) g.rect(0, y, 12, 0.12, c.lighter);
      g.rect(5.6, 5.2, 0.8, 0.4, c.dark);
    },
  },
  // ---------------- London
  bigben: {
    w: 7, h: 11.4,
    draw(g) {
      const { c } = g;
      g.rect(2.2, 0, 4.8, 3.4, c.gold).windows(2.4, 0.4, 4.4, 2.6, 6, 3, c.dark, 0.4, 0.6);
      for (let i = 0; i < 7; i++) g.spire(2.4 + i * 0.7, 3.4, 0.22, 0.6, c.gold);
      g.rect(0.5, 0, 1.7, 7.2, c.gold);
      for (let y = 0.5; y < 6.8; y += 0.55) g.rect(0.6, y, 1.5, 0.1, c.dark);
      g.rect(0.35, 7.2, 2, 1.4, c.gold);
      g.circle(1.35, 7.9, 0.58, c.white).circle(1.35, 7.9, 0.08, c.darker);
      g.line([1.35, 7.9, 1.35, 8.3], c.darker, 0.05).line([1.35, 7.9, 1.6, 7.9], c.darker, 0.05);
      g.rect(0.45, 8.6, 1.8, 0.5, c.gold).poly([0.4, 9.1, 2.3, 9.1, 1.35, 10.6], c.darker);
      g.rect(1.32, 10.6, 0.06, 0.6, c.darker);
    },
    lights(g) {
      g.circle(1.35, 7.9, 0.55, 'rgba(255,240,190,0.95)');
    },
  },
  londoneye: {
    w: 10, h: 10,
    draw(g) {
      const { c } = g;
      g.line([2.6, 0, 5, 5, 3.8, 0], c.white, 0.22);
      g.wheel(5, 5, 4.7, c.white, c.glass, 24, 0.14);
    },
    lights(g) {
      g.ctx.strokeStyle = 'rgba(160,210,255,0.9)';
      g.ctx.lineWidth = 0.12;
      g.ctx.beginPath();
      g.ctx.arc(5, 5, 4.7, 0, PI * 2);
      g.ctx.stroke();
    },
  },
  shard: {
    w: 5, h: 11.6,
    draw(g) {
      const { c } = g;
      g.poly([0.4, 0, 4.6, 0, 2.8, 11.6, 2.2, 10.4], c.glass);
      g.poly([2.5, 0, 4.6, 0, 2.8, 11.6], c.lighter);
      for (let y = 1; y < 10; y += 0.6) g.rect(0.4 + y * 0.17, y, 4.2 - y * 0.36, 0.05, c.light);
    },
    lights(g) {
      g.poly([2.4, 10.2, 2.9, 10.2, 2.8, 11.6], 'rgba(255,255,255,0.9)');
    },
  },
  // ---------------- Paris
  eiffel: {
    w: 7, h: 11.8,
    draw(g) {
      const { c } = g;
      const col = mix(c.base, '#6B5B4B', 0.45);
      const ctx = g.ctx;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(2.2, 2.4, 3.05, 7.5);
      ctx.lineTo(3.25, 10.6);
      ctx.lineTo(3.75, 10.6);
      ctx.lineTo(3.95, 7.5);
      ctx.quadraticCurveTo(4.8, 2.4, 7, 0);
      ctx.lineTo(5.6, 0);
      ctx.quadraticCurveTo(3.5, 2.6, 1.4, 0);
      ctx.closePath();
      ctx.fill();
      g.rect(0.9, 2.3, 5.2, 0.35, col).rect(2.35, 5.3, 2.3, 0.3, col).rect(3.15, 10.4, 0.7, 0.3, col);
      g.rect(3.47, 10.7, 0.06, 1.1, col);
      ctx.strokeStyle = shade(col, 0.2);
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      for (let y = 0.4; y < 7.5; y += 0.45) {
        const t = y / 7.5;
        const hw = 3.5 - (3.5 - 0.45) * Math.sqrt(t);
        ctx.moveTo(3.5 - hw, y);
        ctx.lineTo(3.5 + hw, y + 0.45);
        ctx.moveTo(3.5 + hw, y);
        ctx.lineTo(3.5 - hw, y + 0.45);
      }
      ctx.stroke();
    },
    lights(g) {
      const ctx = g.ctx;
      ctx.fillStyle = 'rgba(255,196,90,0.55)';
      ctx.beginPath();
      ctx.moveTo(0.2, 0);
      ctx.quadraticCurveTo(2.2, 2.4, 3.05, 7.5);
      ctx.lineTo(3.25, 10.6);
      ctx.lineTo(3.75, 10.6);
      ctx.lineTo(3.95, 7.5);
      ctx.quadraticCurveTo(4.8, 2.4, 6.8, 0);
      ctx.lineTo(5.6, 0);
      ctx.quadraticCurveTo(3.5, 2.6, 1.4, 0);
      ctx.fill();
      g.circle(3.5, 11.8, 0.15, '#FFFFFF');
    },
  },
  arc: {
    w: 7, h: 6.4,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 7, 5.4, c.white).rect(-0.2, 5.4, 7.4, 0.5, c.lighter).rect(0, 5.9, 7, 0.5, c.white);
      g.arches(1.6, 0, 3.8, 4.2, 1, c.dark);
      g.rect(0.3, 2.4, 1.0, 1.3, c.light).rect(5.7, 2.4, 1.0, 1.3, c.light);
      g.rect(0, 4.5, 7, 0.15, c.light);
    },
  },
  sacrecoeur: {
    w: 10, h: 8.4,
    draw(g) {
      const { c } = g;
      g.dome(5, 0, 5.4, 2.4, c.green);
      g.rect(2.4, 2, 5.2, 2.6, c.white).arches(2.6, 2, 4.8, 1.8, 3, c.light);
      g.rect(4.1, 4.6, 1.8, 1.0, c.white).dome(5, 5.6, 1.1, 1.8, c.white).rect(4.92, 7.4, 0.16, 0.5, c.white);
      for (const x of [3.0, 7.0]) g.rect(x - 0.4, 4.6, 0.8, 0.5, c.white).dome(x, 5.1, 0.45, 0.8, c.white);
      g.rect(7.8, 2, 0.9, 4.6, c.white).dome(8.25, 6.6, 0.45, 0.8, c.white);
    },
  },
  // ---------------- Madrid
  alcala: {
    w: 9, h: 5.8,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 9, 4.2, mix(c.base, '#D9C7A6', 0.45));
      g.arches(0.2, 0, 8.6, 3.4, 5, c.dark);
      g.rect(-0.2, 4.2, 9.4, 0.35, c.light).rect(2.6, 4.55, 3.8, 0.8, mix(c.base, '#D9C7A6', 0.45));
      g.poly([3.2, 5.35, 5.8, 5.35, 4.5, 5.8], c.light);
    },
  },
  metropolis: {
    w: 5, h: 9.2,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 5, 5.6, c.white).windows(0.3, 0.4, 4.4, 4.8, 4, 5, c.dark, 0.4, 0.55);
      g.ellipse(2.5, 5.6, 2.6, 0.3, c.light);
      g.rect(0.7, 5.6, 3.6, 1.1, c.white);
      g.dome(2.5, 6.7, 1.9, 1.6, c.darker);
      g.rect(1.2, 6.7, 2.6, 0.15, c.gold);
      g.rect(2.3, 8.25, 0.4, 0.5, c.gold).circle(2.5, 8.95, 0.25, c.gold);
    },
  },
  kio: {
    w: 10, h: 9.4,
    draw(g) {
      const { c } = g;
      g.poly([0.5, 0, 3.2, 0, 4.4, 8.6, 1.7, 8.6], c.glass);
      g.poly([6.8, 0, 9.5, 0, 8.3, 8.6, 5.6, 8.6], c.glass);
      for (let y = 0.5; y < 8.4; y += 0.5) {
        const k = y / 8.6;
        g.rect(0.5 + k * 1.2, y, 2.7, 0.06, c.light);
        g.rect(6.8 - k * 1.2, y, 2.7, 0.06, c.light);
      }
      g.rect(1.7, 8.6, 2.7, 0.5, c.red).rect(5.6, 8.6, 2.7, 0.5, c.red);
    },
  },
  // ---------------- Rome
  colosseum: {
    w: 12, h: 6.4,
    draw(g) {
      const { c } = g;
      const col = mix(c.base, '#C9A57C', 0.5);
      g.poly([0, 0, 12, 0, 12, 4.8, 9, 5.8, 3, 5.8, 0, 6.2], col);
      for (let r = 0; r < 3; r++) g.arches(0.2, 0.2 + r * 1.6, 11.6, 1.35, 10, shade(col, -0.35));
      g.rect(0, 4.9, 12, 0.12, shade(col, -0.15));
      g.windows(0.3, 5.0, 3, 0.9, 4, 1, shade(col, -0.25), 0.3, 0.5);
    },
    lights(g) {
      for (let r = 0; r < 3; r++) g.arches(0.2, 0.2 + r * 1.6, 11.6, 1.35, 10, 'rgba(255,200,120,0.8)');
    },
  },
  stpeterrome: {
    w: 12, h: 9.6,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 12, 3.6, c.white).windows(0.3, 0.4, 11.4, 2.8, 12, 2, c.dark, 0.35, 0.6);
      for (let i = 0; i < 12; i++) g.rect(0.35 + i * 0.97, 3.6, 0.25, 0.4, c.white);
      g.rect(3.8, 3.6, 4.4, 1.6, c.white);
      for (let i = 0; i < 8; i++) g.rect(3.95 + i * 0.55, 3.6, 0.2, 1.6, c.lighter);
      g.dome(6, 5.2, 2.6, 3.0, mix(c.base, '#8AA6B6', 0.5));
      g.rect(5.6, 8.1, 0.8, 0.7, c.white).spire(6, 8.8, 0.4, 0.5, c.white);
      g.rect(5.97, 9.2, 0.06, 0.35, c.gold);
    },
  },
  pines: {
    w: 10, h: 5.4,
    draw(g) {
      const { c } = g;
      for (const [x, h] of [[1.6, 4.2], [4.6, 5], [8, 4.4]]) {
        g.line([x, 0, x + 0.3, h - 0.6], c.darker, 0.2);
        g.ellipse(x + 0.3, h, 1.8, 0.55, c.green);
        g.ellipse(x + 0.6, h + 0.2, 1.1, 0.35, shade(c.green, 0.1));
      }
    },
  },
  // ---------------- Vienna
  stephansdom: {
    w: 10, h: 11.6,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 10, 3.4, c.light).windows(0.3, 0.4, 6, 2.6, 5, 1, c.win, 0.35, 0.8);
      g.poly([0, 3.4, 7.5, 3.4, 6, 6.2, 1.5, 6.2], mix(c.base, '#3E7D6A', 0.5));
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) g.poly([1 + i * 1.2, 3.6 + j * 0.85, 1.6 + i * 1.2, 4.0 + j * 0.85, 2.2 + i * 1.2, 3.6 + j * 0.85], c.gold);
      g.rect(7.4, 0, 1.8, 5.6, c.light);
      g.poly([7.4, 5.6, 9.2, 5.6, 8.3, 11.4], c.light);
      for (let y = 6; y < 10.5; y += 0.7) g.rect(8.3 - (11.4 - y) * 0.13, y, (11.4 - y) * 0.26, 0.08, c.dark);
    },
  },
  riesenrad: {
    w: 9, h: 9.6,
    draw(g) {
      const { c } = g;
      g.line([2.2, 0, 4.5, 5, 6.8, 0], c.dark, 0.28);
      g.wheel(4.5, 5, 4.3, c.dark, c.red, 15, 0.14);
    },
  },
  karlskirche: {
    w: 10, h: 8.8,
    draw(g) {
      const { c } = g;
      g.rect(1.8, 0, 6.4, 3.4, c.white);
      g.rect(3.3, 0, 3.4, 3.6, c.lighter).poly([3.1, 3.6, 6.9, 3.6, 5, 4.6], c.white);
      for (let i = 0; i < 6; i++) g.rect(3.45 + i * 0.6, 0, 0.22, 3.3, c.white);
      for (const x of [1.4, 8.6]) {
        g.rect(x - 0.6, 0, 1.2, 5.4, c.white).ellipse(x, 5.45, 0.65, 0.2, c.light);
        for (let y = 0.7; y < 5.2; y += 0.6) g.rect(x - 0.6, y, 1.2, 0.08, c.light);
      }
      g.rect(3.7, 4.4, 2.6, 1.2, c.white).dome(5, 5.6, 1.8, 2.1, mix(c.base, '#5E9E86', 0.5));
      g.rect(4.75, 7.6, 0.5, 0.6, c.white).spire(5, 8.2, 0.3, 0.6, c.gold);
    },
  },
  // ---------------- Prague
  tyn: {
    w: 7, h: 10,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 7, 3.6, c.white).poly([0.6, 3.6, 6.4, 3.6, 3.5, 5.8], c.light);
      for (const x of [1.6, 5.4]) {
        g.rect(x - 0.7, 0, 1.4, 6.6, c.light);
        g.spire(x, 6.6, 1.6, 3.2, c.darker);
        for (const dx of [-0.7, 0.7]) g.spire(x + dx, 6.6, 0.35, 1.4, c.darker);
        g.spire(x, 7.6, 0.3, 1.2, c.darker).circle(x, 9.9, 0.1, c.gold);
      }
    },
  },
  charlesbridge: {
    w: 14, h: 7,
    draw(g) {
      const { c } = g;
      g.rect(-0.5, 0, 15, 0.4, c.water);
      g.rect(0, 1.8, 14, 0.6, c.light);
      for (let i = 0; i < 5; i++) g.dome(1.5 + i * 2.75, 0.3, 1.15, 1.5, c.water);
      for (let i = 0; i < 6; i++) g.rect(0.25 + i * 2.75, 0.3, 0.5, 1.5, c.light);
      g.rect(10.8, 0.3, 2.4, 4.8, c.dark).arches(11.2, 1.8, 1.6, 1.8, 1, c.water);
      g.spire(12, 5.1, 2.7, 1.8, c.darker);
      for (let i = 0; i < 7; i++) g.rect(0.6 + i * 1.4, 2.4, 0.15, 0.8, c.darker);
    },
  },
  castle: {
    w: 14, h: 9,
    draw(g) {
      const { c } = g;
      g.dome(7, 0, 7.4, 2, c.green);
      g.rect(0.5, 1.6, 13, 2.2, c.white).windows(0.7, 1.8, 12.6, 1.8, 16, 2, c.dark, 0.35, 0.5);
      g.poly([0.5, 3.8, 13.5, 3.8, 13, 4.3, 1, 4.3], c.copper);
      g.rect(5.5, 3.8, 3.6, 2.4, c.dark).poly([5.5, 6.2, 9.1, 6.2, 7.3, 7.0], c.darker);
      for (const x of [6.0, 8.6]) g.spire(x, 6.2, 0.8, 2.6, c.darker);
      g.rect(9.4, 3.8, 1.2, 3.2, c.dark).spire(10, 7, 1.2, 1.6, c.copper);
    },
    lights(g) {
      g.windows(0.7, 1.8, 12.6, 1.8, 16, 2, 'rgba(255,214,140,0.7)', 0.35, 0.5);
    },
  },
  // ---------------- Berlin
  brandenburg: {
    w: 9, h: 6.4,
    draw(g) {
      const { c } = g;
      const col = mix(c.base, '#D8C9A8', 0.5);
      g.rect(0, 0, 9, 0.4, shade(col, -0.1));
      for (let i = 0; i < 6; i++) g.rect(0.35 + i * 1.6, 0.4, 0.5, 3.6, col);
      g.rect(-0.1, 4, 9.2, 0.9, col).rect(-0.1, 4.0, 9.2, 0.15, shade(col, -0.15));
      g.rect(2.5, 4.9, 4, 0.5, col);
      // quadriga
      g.poly([3.4, 5.4, 5.6, 5.4, 5.4, 6.0, 3.6, 6.0], c.copper);
      for (let i = 0; i < 4; i++) g.rect(3.5 + i * 0.5, 5.4, 0.15, 0.4, c.copper);
      g.line([4.5, 6.0, 4.5, 6.4], c.copper, 0.1);
    },
    lights(g) {
      for (let i = 0; i < 6; i++) g.rect(0.35 + i * 1.6, 0.4, 0.5, 3.6, 'rgba(255,214,140,0.45)');
    },
  },
  fernsehturm: {
    w: 3, h: 11.6,
    draw(g) {
      const { c } = g;
      g.poly([1.1, 0, 1.9, 0, 1.68, 7.4, 1.32, 7.4], c.light);
      g.circle(1.5, 7.6, 0.95, c.white);
      g.rect(0.55, 7.45, 1.9, 0.18, c.dark);
      g.rect(1.38, 8.5, 0.24, 1.2, c.light).rect(1.44, 9.7, 0.12, 1.6, c.red);
      g.rect(1.44, 10.1, 0.12, 0.2, c.white).rect(1.44, 10.7, 0.12, 0.2, c.white);
    },
    lights(g) {
      g.rect(0.6, 7.45, 1.8, 0.16, '#FFD58A').circle(1.5, 11.35, 0.12, '#FF4A3A');
    },
  },
  reichstag: {
    w: 11, h: 7,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 11, 3.8, c.light).windows(0.3, 0.4, 10.4, 3, 12, 2, c.win, 0.35, 0.55);
      g.rect(3.6, 0, 3.8, 4.2, c.lighter).poly([3.4, 4.2, 7.6, 4.2, 5.5, 4.8], c.light);
      for (let i = 0; i < 6; i++) g.rect(3.8 + i * 0.62, 0, 0.22, 3.9, c.white);
      for (const x of [0, 9.6]) g.rect(x, 0, 1.4, 4.6, c.light);
      g.dome(5.5, 4.8, 1.8, 1.9, c.glass);
      g.ctx.strokeStyle = c.dark;
      g.ctx.lineWidth = 0.05;
      for (let i = 1; i < 5; i++) {
        g.ctx.beginPath();
        g.ctx.ellipse(5.5, 4.8, 1.8 * Math.sin((i / 5) * PI), 1.9, 0, 0, PI);
        g.ctx.stroke();
      }
    },
    lights(g) {
      g.dome(5.5, 4.8, 1.75, 1.85, 'rgba(255,236,190,0.7)');
    },
  },
  // ---------------- Warsaw
  pkin: {
    w: 8, h: 11.6,
    draw(g) {
      const { c } = g;
      const col = mix(c.base, '#D9CDB6', 0.45);
      g.rect(0, 0, 8, 2.4, col).rect(1.2, 2.4, 5.6, 2.2, col).rect(2.2, 4.6, 3.6, 2.4, col).rect(2.8, 7, 2.4, 1.2, col).rect(3.2, 8.2, 1.6, 0.8, col);
      g.windows(0.3, 0.3, 7.4, 1.9, 10, 3, shade(col, -0.35), 0.4, 0.5).windows(1.4, 2.6, 5.2, 1.8, 7, 3, shade(col, -0.35), 0.4, 0.5).windows(2.4, 4.8, 3.2, 2, 4, 3, shade(col, -0.35), 0.4, 0.5);
      g.spire(4, 9, 1.2, 2.6, col);
      g.rect(3.96, 11.3, 0.08, 0.3, c.darker);
      g.circle(4, 7.6, 0.3, c.white);
    },
    lights(g) {
      g.windows(1.4, 2.6, 5.2, 1.8, 7, 3, 'rgba(255,214,140,0.7)', 0.4, 0.5).circle(4, 7.6, 0.28, '#FFF0C8');
    },
  },
  varsoskyline: {
    w: 11, h: 11.4,
    draw(g) {
      const { c } = g;
      g.rect(0, 0, 2.4, 7, c.glass).rect(2.8, 0, 2.2, 9.4, c.light);
      g.poly([5.6, 0, 7.8, 0, 7.8, 8.6, 6.6, 10.4, 5.6, 9.2], c.glass);
      g.rect(8.2, 0, 2.6, 7.6, c.lighter).poly([8.9, 7.6, 10.1, 7.6, 9.5, 11.4], c.light);
      for (let y = 0.5; y < 9; y += 0.5) g.rect(0, y, 10.8, 0.05, c.lighter);
    },
    lights(g) {
      g.circle(9.5, 11.3, 0.12, '#FF4A3A');
      g.windows(2.9, 0.5, 2, 8.4, 4, 12, 'rgba(255,224,170,0.65)', 0.6, 0.35);
    },
  },
  zamek: {
    w: 10, h: 8,
    draw(g) {
      const { c } = g;
      const col = mix(c.base, '#C76B45', 0.5);
      g.rect(0, 0, 10, 3.8, col).windows(0.3, 0.4, 9.4, 3, 10, 2, c.white, 0.4, 0.6);
      g.poly([0, 3.8, 10, 3.8, 9.6, 4.6, 0.4, 4.6], c.copper);
      g.rect(4.1, 0, 1.8, 6.2, col).circle(5, 5.4, 0.42, c.white);
      g.rect(4.25, 6.2, 1.5, 0.6, c.copper).ellipse(5, 6.95, 0.6, 0.3, c.copper).spire(5, 7.1, 0.5, 0.9, c.copper);
    },
  },
};

/** Fallback for any id that is missing. */
export const DEFAULT_LANDMARK = LANDMARKS.tvtower;
