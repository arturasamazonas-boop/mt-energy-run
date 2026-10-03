// Procedural city buildings, MT GROUP office tower, tower cranes and billboards.
// Every draw function draws in "units" scaled by `s` with (0,0) at the top-left of
// the bounding box. `em` = emissive pass (only lit windows / signs are drawn).
import { shade, mix, rgba, roundRect, BRAND_Y, BRAND_K } from './util.js';
import { createRng } from '/shared/rng.js';

export const IMAGES = {};

export function loadImages() {
  const list = { logo: '/assets/mt-logo.png', logoLight: '/assets/mt-logo-light.png', emblem: '/assets/mt-emblem.png' };
  return Promise.all(
    Object.entries(list).map(
      ([k, src]) =>
        new Promise((res) => {
          const img = new Image();
          img.onload = () => {
            IMAGES[k] = img;
            res();
          };
          img.onerror = () => res();
          img.src = src;
        }),
    ),
  );
}

/** Building spec generator (deterministic). */
export function makeBuilding(theme, seed) {
  const r = createRng(seed);
  const floors = r.int(theme.floors[0], theme.floors[1]);
  const fh = 1.05;
  const cols = r.int(2, 5);
  const w = cols * 1.25 + 0.6 + r.range(0, 0.6);
  const roofType = r.pick(theme.roof);
  return {
    w,
    h: floors * fh + 0.5,
    floors,
    fh,
    cols,
    facade: r.pick(theme.facades),
    roof: r.pick(theme.roofs),
    roofType,
    roofH: roofType === 'flat' ? 0.35 : roofType === 'saw' ? 1.0 : roofType === 'mansard' ? 1.5 : roofType === 'stepped' || roofType === 'bell' ? 2.0 : 1.6,
    shop: r.chance(0.55),
    balcony: r.chance(0.35),
    chimney: r.chance(0.5),
    antenna: r.chance(0.18),
    lit: Array.from({ length: floors * cols }, () => r.chance(0.48)),
    seed,
  };
}

export function buildingSize(b) {
  return { w: b.w, h: b.h + b.roofH + (b.chimney ? 0.6 : 0) + (b.antenna ? 1.2 : 0) };
}

export function drawBuilding(ctx, b, s, em = false) {
  const top = (b.roofH + (b.chimney ? 0.6 : 0) + (b.antenna ? 1.2 : 0)) * s;
  const W = b.w * s;
  const H = b.h * s;
  ctx.save();
  ctx.translate(0, top);
  if (!em) {
    // body
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, shade(b.facade, 0.06));
    g.addColorStop(1, shade(b.facade, -0.1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // cornice + base
    ctx.fillStyle = shade(b.facade, -0.22);
    ctx.fillRect(-0.08 * s, -0.05 * s, W + 0.16 * s, 0.22 * s);
    ctx.fillStyle = shade(b.facade, -0.14);
    ctx.fillRect(0, H - 1.0 * s, W, 0.12 * s);
    // floor bands
    ctx.fillStyle = rgba(shade(b.facade, -0.3), 0.18);
    for (let f = 1; f < b.floors; f++) ctx.fillRect(0, f * b.fh * s + 0.15 * s, W, 0.06 * s);
    // roof
    drawRoof(ctx, b, s, W);
  }
  // windows
  const ww = 0.55 * s;
  const wh = 0.62 * s;
  const gap = (W - b.cols * ww) / (b.cols + 1);
  for (let f = 0; f < b.floors - (b.shop ? 1 : 0); f++) {
    for (let c = 0; c < b.cols; c++) {
      const x = gap + c * (ww + gap);
      const y = 0.32 * s + f * b.fh * s;
      const lit = b.lit[f * b.cols + c];
      if (em) {
        if (!lit) continue;
        ctx.fillStyle = '#FFD58A';
        ctx.fillRect(x, y, ww, wh);
        ctx.fillStyle = 'rgba(255,214,140,0.25)';
        ctx.fillRect(x - 0.12 * s, y - 0.12 * s, ww + 0.24 * s, wh + 0.24 * s);
        continue;
      }
      ctx.fillStyle = shade(b.facade, -0.35);
      ctx.fillRect(x - 0.06 * s, y - 0.06 * s, ww + 0.12 * s, wh + 0.12 * s);
      const wg = ctx.createLinearGradient(x, y, x + ww, y + wh);
      wg.addColorStop(0, '#7E9BB3');
      wg.addColorStop(0.55, '#4B6378');
      wg.addColorStop(1, '#3A4D5E');
      ctx.fillStyle = wg;
      ctx.fillRect(x, y, ww, wh);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.moveTo(x, y + wh * 0.55);
      ctx.lineTo(x + ww * 0.55, y);
      ctx.lineTo(x + ww * 0.8, y);
      ctx.lineTo(x, y + wh * 0.85);
      ctx.fill();
      ctx.fillStyle = shade(b.facade, -0.25);
      ctx.fillRect(x + ww / 2 - 0.03 * s, y, 0.06 * s, wh);
      if (b.balcony && f % 2 === 1) {
        ctx.fillStyle = shade(b.facade, -0.4);
        ctx.fillRect(x - 0.12 * s, y + wh - 0.02 * s, ww + 0.24 * s, 0.08 * s);
        for (let i = 0; i <= 4; i++) ctx.fillRect(x - 0.1 * s + (i * (ww + 0.2 * s)) / 4, y + wh - 0.3 * s, 0.03 * s, 0.3 * s);
      }
    }
  }
  // ground floor shops
  if (b.shop) {
    const y = H - 1.0 * s;
    if (em) {
      ctx.fillStyle = 'rgba(255,220,150,0.85)';
      ctx.fillRect(0.3 * s, y + 0.25 * s, W - 0.6 * s, 0.6 * s);
    } else {
      ctx.fillStyle = '#2E3B47';
      ctx.fillRect(0.3 * s, y + 0.25 * s, W - 0.6 * s, 0.75 * s);
      ctx.fillStyle = 'rgba(160,200,230,0.35)';
      ctx.fillRect(0.35 * s, y + 0.3 * s, W - 0.7 * s, 0.3 * s);
      const r = createRng(b.seed + 'awn');
      ctx.fillStyle = r.pick(['#B5432F', '#2F6E5A', '#2C4E86', '#8A5A2B']);
      ctx.beginPath();
      ctx.moveTo(0.2 * s, y + 0.1 * s);
      ctx.lineTo(W - 0.2 * s, y + 0.1 * s);
      ctx.lineTo(W - 0.05 * s, y + 0.38 * s);
      ctx.lineTo(0.05 * s, y + 0.38 * s);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawRoof(ctx, b, s, W) {
  const rh = b.roofH * s;
  ctx.fillStyle = b.roof;
  switch (b.roofType) {
    case 'gable': {
      ctx.beginPath();
      ctx.moveTo(-0.15 * s, 0);
      ctx.lineTo(W / 2, -rh);
      ctx.lineTo(W + 0.15 * s, 0);
      ctx.fill();
      ctx.fillStyle = shade(b.roof, 0.15);
      ctx.beginPath();
      ctx.moveTo(W / 2, -rh);
      ctx.lineTo(W + 0.15 * s, 0);
      ctx.lineTo(W / 2 + 0.2 * s, 0);
      ctx.fill();
      ctx.fillStyle = '#3A4A58';
      ctx.fillRect(W / 2 - 0.22 * s, -rh * 0.5, 0.44 * s, 0.4 * s);
      break;
    }
    case 'hip': {
      ctx.beginPath();
      ctx.moveTo(-0.15 * s, 0);
      ctx.lineTo(W * 0.22, -rh);
      ctx.lineTo(W * 0.78, -rh);
      ctx.lineTo(W + 0.15 * s, 0);
      ctx.fill();
      ctx.fillStyle = shade(b.roof, -0.15);
      ctx.fillRect(-0.15 * s, -0.1 * s, W + 0.3 * s, 0.1 * s);
      break;
    }
    case 'mansard': {
      ctx.beginPath();
      ctx.moveTo(-0.1 * s, 0);
      ctx.lineTo(0.35 * s, -rh);
      ctx.lineTo(W - 0.35 * s, -rh);
      ctx.lineTo(W + 0.1 * s, 0);
      ctx.fill();
      // dormers
      const n = Math.max(1, Math.round(W / s / 1.6));
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.5) * W) / n - 0.25 * s;
        ctx.fillStyle = '#EDE6D6';
        ctx.fillRect(x - 0.06 * s, -rh * 0.72, 0.62 * s, 0.62 * s);
        ctx.fillStyle = '#3F5262';
        ctx.fillRect(x + 0.04 * s, -rh * 0.64, 0.42 * s, 0.5 * s);
      }
      ctx.fillStyle = shade(b.roof, -0.2);
      ctx.fillRect(0.3 * s, -rh - 0.08 * s, W - 0.6 * s, 0.1 * s);
      break;
    }
    case 'stepped': {
      ctx.fillStyle = b.facade;
      const steps = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 0; i < steps; i++) {
        const x = (i * W) / (steps * 2);
        const y = -((i + 1) * rh) / steps;
        ctx.lineTo(x, y + rh / steps);
        ctx.lineTo(x, y);
      }
      for (let i = steps - 1; i >= 0; i--) {
        const x = W - (i * W) / (steps * 2);
        const y = -((i + 1) * rh) / steps;
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + rh / steps);
      }
      ctx.lineTo(W, 0);
      ctx.fill();
      ctx.fillStyle = '#F2EEE6';
      ctx.fillRect(W / 2 - 0.25 * s, -rh * 0.6, 0.5 * s, 0.55 * s);
      break;
    }
    case 'bell': {
      ctx.fillStyle = b.facade;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(0, -rh * 0.5, W * 0.3, -rh * 0.5, W * 0.32, -rh);
      ctx.lineTo(W * 0.68, -rh);
      ctx.bezierCurveTo(W * 0.7, -rh * 0.5, W, -rh * 0.5, W, 0);
      ctx.fill();
      ctx.fillStyle = '#F2EEE6';
      ctx.beginPath();
      ctx.arc(W / 2, -rh * 0.45, 0.3 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#F2EEE6';
      ctx.lineWidth = 0.08 * s;
      ctx.beginPath();
      ctx.moveTo(W * 0.3, -rh);
      ctx.lineTo(W * 0.7, -rh);
      ctx.stroke();
      break;
    }
    case 'saw': {
      const n = Math.max(2, Math.round(W / s / 1.4));
      for (let i = 0; i < n; i++) {
        const x0 = (i * W) / n;
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0, -rh);
        ctx.lineTo(x0 + W / n, 0);
        ctx.fill();
        ctx.fillStyle = 'rgba(170,205,230,0.7)';
        ctx.fillRect(x0 + 0.05 * s, -rh * 0.95, 0.12 * s, rh * 0.85);
        ctx.fillStyle = b.roof;
      }
      break;
    }
    default: {
      ctx.fillStyle = shade(b.facade, -0.18);
      ctx.fillRect(-0.05 * s, -rh, W + 0.1 * s, rh);
    }
  }
  if (b.chimney) {
    ctx.fillStyle = shade(b.roof, -0.1);
    ctx.fillRect(W * 0.72, -rh * 0.7 - 0.6 * s, 0.35 * s, 0.6 * s + rh * 0.3);
  }
  if (b.antenna) {
    ctx.strokeStyle = '#4A4F55';
    ctx.lineWidth = 0.06 * s;
    ctx.beginPath();
    ctx.moveTo(W * 0.3, -rh);
    ctx.lineTo(W * 0.3, -rh - 1.2 * s);
    ctx.moveTo(W * 0.3 - 0.3 * s, -rh - 0.8 * s);
    ctx.lineTo(W * 0.3 + 0.3 * s, -rh - 0.8 * s);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// MT GROUP office tower (mid layer)
// ---------------------------------------------------------------------------
export const MT_TOWER = { w: 9, h: 13.5 };

export function drawMtTower(ctx, s, em = false) {
  const W = MT_TOWER.w * s;
  const H = MT_TOWER.h * s;
  const signH = 1.7 * s;
  const bodyTop = signH + 0.4 * s;
  if (!em) {
    // glass body
    const g = ctx.createLinearGradient(0, bodyTop, W, H);
    g.addColorStop(0, '#9DB8CC');
    g.addColorStop(0.45, '#5E7D96');
    g.addColorStop(1, '#3E566B');
    ctx.fillStyle = g;
    ctx.fillRect(0, bodyTop, W, H - bodyTop);
    // dark side
    ctx.fillStyle = 'rgba(20,30,45,0.25)';
    ctx.fillRect(W * 0.72, bodyTop, W * 0.28, H - bodyTop);
    // reflections
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.moveTo(0, bodyTop + H * 0.3);
    ctx.lineTo(W * 0.5, bodyTop);
    ctx.lineTo(W * 0.68, bodyTop);
    ctx.lineTo(0, bodyTop + H * 0.52);
    ctx.fill();
    // mullions
    ctx.strokeStyle = 'rgba(30,40,52,0.55)';
    ctx.lineWidth = Math.max(1, 0.05 * s);
    for (let x = 0.75; x < MT_TOWER.w; x += 0.75) {
      ctx.beginPath();
      ctx.moveTo(x * s, bodyTop);
      ctx.lineTo(x * s, H);
      ctx.stroke();
    }
    for (let y = bodyTop + 0.9 * s; y < H; y += 0.9 * s) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // yellow accent fin
    ctx.fillStyle = BRAND_Y;
    ctx.fillRect(-0.18 * s, bodyTop, 0.3 * s, H - bodyTop);
    // entrance
    ctx.fillStyle = '#26323D';
    ctx.fillRect(W * 0.3, H - 1.3 * s, W * 0.4, 1.3 * s);
    ctx.fillStyle = 'rgba(255,230,160,0.5)';
    ctx.fillRect(W * 0.32, H - 1.2 * s, W * 0.36, 1.1 * s);
    // roof crown + sign
    ctx.fillStyle = BRAND_K;
    roundRect(ctx, 0.3 * s, 0, W - 0.6 * s, signH, 0.15 * s);
    ctx.fill();
    ctx.fillStyle = '#3A3A3A';
    ctx.fillRect(0.6 * s, signH, W - 1.2 * s, 0.4 * s);
  }
  const logo = IMAGES.logoLight;
  if (logo) {
    const lh = signH * 0.72;
    const lw = (logo.width / logo.height) * lh;
    ctx.save();
    if (em) ctx.globalAlpha = 0.95;
    ctx.drawImage(logo, W / 2 - lw / 2, signH * 0.14, lw, lh);
    ctx.restore();
  }
  if (em) {
    // lit floors
    const r = createRng('mt-tower');
    for (let y = bodyTop + 0.15 * s; y < H - 1.4 * s; y += 0.9 * s) {
      for (let x = 0.08; x < MT_TOWER.w - 0.7; x += 0.75) {
        if (r.chance(0.55)) {
          ctx.fillStyle = 'rgba(255,226,160,0.85)';
          ctx.fillRect(x * s + 0.06 * s, y, 0.62 * s, 0.62 * s);
        }
      }
    }
    ctx.fillStyle = 'rgba(255,216,0,0.9)';
    ctx.fillRect(-0.18 * s, bodyTop, 0.3 * s, H - bodyTop);
  }
}

// ---------------------------------------------------------------------------
// Tower crane (mid layer) – MT yellow
// ---------------------------------------------------------------------------
export const CRANE = { w: 12, h: 14 };

export function drawCrane(ctx, s, em = false) {
  if (em) {
    ctx.fillStyle = 'rgba(255,60,40,0.95)';
    ctx.beginPath();
    ctx.arc(3.2 * s, 0.4 * s, 0.18 * s, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const mastX = 3 * s;
  const mastW = 0.5 * s;
  const H = CRANE.h * s;
  const jibY = 2.2 * s;
  ctx.strokeStyle = BRAND_Y;
  ctx.fillStyle = BRAND_Y;
  ctx.lineWidth = Math.max(1, 0.08 * s);
  // mast lattice
  ctx.strokeRect(mastX, jibY, mastW, H - jibY);
  ctx.beginPath();
  for (let y = jibY; y < H; y += 0.6 * s) {
    ctx.moveTo(mastX, y);
    ctx.lineTo(mastX + mastW, y + 0.6 * s);
    ctx.moveTo(mastX + mastW, y);
    ctx.lineTo(mastX, y + 0.6 * s);
  }
  ctx.stroke();
  // jib
  ctx.strokeRect(0, jibY - 0.4 * s, CRANE.w * s, 0.4 * s);
  ctx.beginPath();
  for (let x = 0; x < CRANE.w * s; x += 0.6 * s) {
    ctx.moveTo(x, jibY - 0.4 * s);
    ctx.lineTo(x + 0.3 * s, jibY);
    ctx.lineTo(x + 0.6 * s, jibY - 0.4 * s);
  }
  ctx.stroke();
  // apex + ties
  ctx.beginPath();
  ctx.moveTo(mastX, jibY - 0.4 * s);
  ctx.lineTo(mastX + mastW / 2, 0.4 * s);
  ctx.lineTo(mastX + mastW, jibY - 0.4 * s);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, 0.03 * s);
  ctx.strokeStyle = '#6B6B6B';
  ctx.beginPath();
  ctx.moveTo(mastX + mastW / 2, 0.4 * s);
  ctx.lineTo(CRANE.w * s * 0.92, jibY - 0.4 * s);
  ctx.moveTo(mastX + mastW / 2, 0.4 * s);
  ctx.lineTo(0.2 * s, jibY - 0.4 * s);
  ctx.stroke();
  // counterweight + cab
  ctx.fillStyle = '#5C5F63';
  ctx.fillRect(0.2 * s, jibY, 1.4 * s, 0.7 * s);
  ctx.fillStyle = BRAND_K;
  ctx.fillRect(mastX + mastW, jibY, 0.7 * s, 0.6 * s);
  ctx.fillStyle = '#8FB4CF';
  ctx.fillRect(mastX + mastW + 0.1 * s, jibY + 0.1 * s, 0.5 * s, 0.3 * s);
  // hook cable + load
  const hx = CRANE.w * s * 0.72;
  ctx.strokeStyle = '#3B3B3B';
  ctx.beginPath();
  ctx.moveTo(hx, jibY);
  ctx.lineTo(hx, jibY + 5 * s);
  ctx.stroke();
  ctx.fillStyle = '#C0392B';
  ctx.fillRect(hx - 0.9 * s, jibY + 5 * s, 1.8 * s, 0.35 * s);
}

// ---------------------------------------------------------------------------
// Billboard (near layer)
// ---------------------------------------------------------------------------
export const BILLBOARD = { w: 7, h: 5.2 };

export function drawBillboard(ctx, s, em, text1, text2) {
  const W = BILLBOARD.w * s;
  const bh = 3.2 * s;
  if (!em) {
    ctx.fillStyle = '#4A4E54';
    ctx.fillRect(W * 0.25 - 0.15 * s, bh, 0.3 * s, BILLBOARD.h * s - bh);
    ctx.fillRect(W * 0.75 - 0.15 * s, bh, 0.3 * s, BILLBOARD.h * s - bh);
    ctx.fillStyle = '#2B2E33';
    ctx.fillRect(0, 0, W, bh);
    ctx.fillStyle = BRAND_K;
    ctx.fillRect(0.15 * s, 0.15 * s, W - 0.3 * s, bh - 0.3 * s);
    ctx.fillStyle = BRAND_Y;
    ctx.fillRect(0.15 * s, bh - 0.55 * s, W - 0.3 * s, 0.4 * s);
  }
  const logo = IMAGES.logoLight;
  if (logo) {
    const lh = 1.25 * s;
    const lw = (logo.width / logo.height) * lh;
    ctx.drawImage(logo, 0.45 * s, 0.38 * s, lw, lh);
  }
  ctx.fillStyle = em ? '#FFFFFF' : '#F4F4F4';
  ctx.font = `800 ${0.62 * s}px "Barlow Condensed", sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text1, 0.45 * s, 2.25 * s);
  ctx.fillStyle = BRAND_K;
  ctx.font = `700 ${0.3 * s}px "Barlow Condensed", sans-serif`;
  ctx.fillText(text2, 0.45 * s, bh - 0.25 * s);
  if (em) {
    ctx.fillStyle = 'rgba(255,240,200,0.12)';
    ctx.fillRect(0, 0, W, bh);
  }
}

export function treeSize(kind) {
  return kind === 'pine' ? { w: 4.2, h: 4.6 } : kind === 'birch' ? { w: 2.4, h: 4.8 } : { w: 3.2, h: 4.6 };
}

export function drawTree(ctx, kind, s, seed) {
  const r = createRng(seed);
  const { w, h } = treeSize(kind);
  const cx = (w / 2) * s;
  if (kind === 'pine') {
    // umbrella pine
    ctx.strokeStyle = '#6B4A35';
    ctx.lineWidth = 0.22 * s;
    ctx.beginPath();
    ctx.moveTo(cx, h * s);
    ctx.quadraticCurveTo(cx + 0.4 * s, h * s * 0.6, cx + 0.2 * s, 1.6 * s);
    ctx.stroke();
    const g = '#3E6B3A';
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 ? g : shade(g, 0.12);
      ctx.beginPath();
      ctx.ellipse(cx + (i - 3) * 0.55 * s, 1.3 * s + Math.abs(i - 3) * 0.12 * s, 0.9 * s, 0.55 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  const trunk = kind === 'birch' ? '#E8E4DA' : '#6A4B37';
  ctx.fillStyle = trunk;
  ctx.fillRect(cx - 0.12 * s, h * s * 0.45, 0.24 * s, h * s * 0.55);
  if (kind === 'birch') {
    ctx.fillStyle = '#3B3B3B';
    for (let i = 0; i < 5; i++) ctx.fillRect(cx - 0.12 * s, h * s * (0.55 + i * 0.08), 0.12 * s, 0.05 * s);
  }
  const leaf = kind === 'birch' ? '#7FA853' : kind === 'elm' ? '#4E7D3E' : kind === 'plane' ? '#5D8A3E' : '#558A45';
  const blobs = 9;
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2;
    const rr = (w / 2 - 0.5) * s * r.range(0.6, 1);
    ctx.fillStyle = i % 3 === 0 ? shade(leaf, 0.12) : i % 3 === 1 ? leaf : shade(leaf, -0.1);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * rr * 0.6, h * s * 0.32 + Math.sin(a) * rr * 0.5, 0.75 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = shade(leaf, 0.18);
  ctx.beginPath();
  ctx.arc(cx - 0.3 * s, h * s * 0.22, 0.6 * s, 0, Math.PI * 2);
  ctx.fill();
}

export const LAMP = { w: 1.4, h: 5 };

export function drawLamp(ctx, s, em, style = 'classic') {
  const x = 0.5 * s;
  if (em) {
    const g = ctx.createRadialGradient(x + 0.35 * s, 0.55 * s, 0, x + 0.35 * s, 0.55 * s, 1.2 * s);
    g.addColorStop(0, 'rgba(255,230,170,0.95)');
    g.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 1 * s, -0.6 * s, 2.8 * s, 2.4 * s);
    return;
  }
  ctx.fillStyle = '#2F3439';
  ctx.fillRect(x - 0.07 * s, 0.5 * s, 0.14 * s, LAMP.h * s - 0.5 * s);
  ctx.fillRect(x - 0.18 * s, LAMP.h * s - 0.3 * s, 0.36 * s, 0.3 * s);
  if (style === 'modern') {
    ctx.fillRect(x - 0.05 * s, 0.4 * s, 0.75 * s, 0.1 * s);
    ctx.fillStyle = '#DADADA';
    ctx.fillRect(x + 0.35 * s, 0.48 * s, 0.4 * s, 0.08 * s);
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 0.28 * s, 0.25 * s);
    ctx.lineTo(x + 0.28 * s, 0.25 * s);
    ctx.lineTo(x + 0.18 * s, 0.75 * s);
    ctx.lineTo(x - 0.18 * s, 0.75 * s);
    ctx.fill();
    ctx.fillStyle = '#F6E7B8';
    ctx.fillRect(x - 0.15 * s, 0.33 * s, 0.3 * s, 0.36 * s);
    ctx.fillStyle = '#2F3439';
    ctx.beginPath();
    ctx.moveTo(x - 0.34 * s, 0.27 * s);
    ctx.lineTo(x, 0.02 * s);
    ctx.lineTo(x + 0.34 * s, 0.27 * s);
    ctx.fill();
  }
}

export const FENCE = { w: 8, h: 2.2 };

/** Construction-site hoarding with MT branding. */
export function drawHoarding(ctx, s, em) {
  if (em) return;
  const W = FENCE.w * s;
  const H = FENCE.h * s;
  ctx.fillStyle = '#F2F2F2';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = BRAND_K;
  ctx.fillRect(0, 0, W, 0.25 * s);
  ctx.fillRect(0, H - 0.25 * s, W, 0.25 * s);
  ctx.fillStyle = BRAND_Y;
  for (let x = 0; x < W; x += 0.6 * s) {
    ctx.beginPath();
    ctx.moveTo(x, H - 0.25 * s);
    ctx.lineTo(x + 0.3 * s, H - 0.25 * s);
    ctx.lineTo(x + 0.15 * s, H);
    ctx.lineTo(x - 0.15 * s, H);
    ctx.fill();
  }
  const logo = IMAGES.logo;
  if (logo) {
    const lh = 1.05 * s;
    const lw = (logo.width / logo.height) * lh;
    ctx.drawImage(logo, 0.5 * s, 0.55 * s, lw, lh);
  }
  ctx.fillStyle = '#555';
  ctx.font = `700 ${0.3 * s}px "Barlow Condensed", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('ENERGY FOR EUROPE', W - 0.5 * s, 1.25 * s);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let x = 2; x < FENCE.w; x += 2) ctx.fillRect(x * s, 0.25 * s, 0.04 * s, H - 0.5 * s);
}

export { mix };

// ---------------------------------------------------------------------------
// Market stall (Rietavas market) and market sign
// ---------------------------------------------------------------------------
export const STALL = { w: 3.2, h: 2.9 };

const AWNINGS = [
  ['#C0392B', '#F4F1EA'],
  ['#2F6E5A', '#F4F1EA'],
  ['#2C4E86', '#F4F1EA'],
  ['#E0A21B', '#F4F1EA'],
  ['#7A3E8C', '#F4F1EA'],
];

export function drawStall(ctx, s, seed) {
  const r = createRng(seed);
  const [a1, a2] = r.pick(AWNINGS);
  const W = STALL.w * s;
  const H = STALL.h * s;
  // posts
  ctx.fillStyle = '#6B4A30';
  ctx.fillRect(0.15 * s, 0.55 * s, 0.1 * s, H - 0.55 * s);
  ctx.fillRect(W - 0.25 * s, 0.55 * s, 0.1 * s, H - 0.55 * s);
  // awning
  const stripes = 7;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? a2 : a1;
    ctx.beginPath();
    ctx.moveTo((i * W) / stripes, 0.15 * s);
    ctx.lineTo(((i + 1) * W) / stripes, 0.15 * s);
    ctx.lineTo(((i + 1) * W) / stripes + 0.05 * s, 0.7 * s);
    ctx.lineTo((i * W) / stripes + 0.05 * s, 0.7 * s);
    ctx.fill();
    // scalloped edge
    ctx.beginPath();
    ctx.arc((i + 0.5) * (W / stripes) + 0.05 * s, 0.7 * s, W / stripes / 2, 0, Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 0.1 * s, W, 0.08 * s);
  // table
  const ty = H - 1.0 * s;
  ctx.fillStyle = '#9A6B3E';
  ctx.fillRect(0.05 * s, ty, W - 0.1 * s, 0.14 * s);
  ctx.fillStyle = '#7C5530';
  ctx.fillRect(0.1 * s, ty + 0.14 * s, W - 0.2 * s, H - ty - 0.14 * s);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let x = 0.4; x < STALL.w - 0.2; x += 0.5) ctx.fillRect(x * s, ty + 0.2 * s, 0.03 * s, H - ty - 0.25 * s);
  // produce crates
  const goods = [
    ['#C8352B', '#E85A4C'], // apples
    ['#6FA24A', '#8DC264'], // cabbages
    ['#E8862A', '#F5A54A'], // pumpkins
    ['#E9C44A', '#F5DA74'], // potatoes / honey
    ['#7A3E8C', '#9E5DB0'], // plums
  ];
  let x = 0.2 * s;
  while (x < W - 0.7 * s) {
    const [g1, g2] = r.pick(goods);
    const cw = r.range(0.6, 0.85) * s;
    ctx.fillStyle = '#B98A55';
    ctx.fillRect(x, ty - 0.28 * s, cw, 0.28 * s);
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = k % 2 ? g1 : g2;
      ctx.beginPath();
      ctx.arc(x + ((k + 0.5) * cw) / 4, ty - 0.3 * s, cw / 7, 0, Math.PI * 2);
      ctx.fill();
    }
    x += cw + 0.08 * s;
  }
  // price tag
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(W * 0.62, ty + 0.25 * s, 0.5 * s, 0.3 * s);
  ctx.fillStyle = '#1E1E1E';
  ctx.font = `700 ${0.2 * s}px "Barlow Condensed", sans-serif`;
  ctx.fillText(`${r.int(1, 4)},${r.pick(['50', '90', '20'])} €`, W * 0.62 + 0.05 * s, ty + 0.48 * s);
}

export const MARKET_SIGN = { w: 5.4, h: 3.8 };

export function drawMarketSign(ctx, s, lang) {
  const W = MARKET_SIGN.w * s;
  ctx.fillStyle = '#5A3E28';
  ctx.fillRect(0.4 * s, 0.9 * s, 0.16 * s, MARKET_SIGN.h * s - 0.9 * s);
  ctx.fillRect(W - 0.56 * s, 0.9 * s, 0.16 * s, MARKET_SIGN.h * s - 0.9 * s);
  ctx.fillStyle = '#8A5A34';
  roundRect(ctx, 0, 0, W, 1.2 * s, 0.15 * s);
  ctx.fill();
  ctx.fillStyle = '#F4E3C3';
  roundRect(ctx, 0.12 * s, 0.12 * s, W - 0.24 * s, 0.96 * s, 0.1 * s);
  ctx.fill();
  ctx.fillStyle = '#5A3E28';
  ctx.font = `800 ${0.58 * s}px "Barlow Condensed", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(lang === 'lt' ? 'RIETAVO TURGUS' : 'RIETAVAS MARKET', W / 2, 0.82 * s);
  ctx.textAlign = 'left';
  // bunting
  const cols = ['#C0392B', '#FFD800', '#2F6E5A', '#2C4E86'];
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = cols[i % 4];
    const x = 0.3 * s + (i * (W - 0.6 * s)) / 8;
    ctx.beginPath();
    ctx.moveTo(x - 0.18 * s, 1.3 * s);
    ctx.lineTo(x + 0.18 * s, 1.3 * s);
    ctx.lineTo(x, 1.65 * s);
    ctx.fill();
  }
}
