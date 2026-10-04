// Gameplay entities: obstacles, pickups, city signs and project gates.
// All functions draw in meter space with y up; origin documented per function.
import { IMAGES } from './buildings.js';
import { shade, roundRect, BRAND_Y, BRAND_K } from './util.js';

const OUT = '#1A1E29';

export function textUp(ctx, str, x, y, font, color, align = 'center', base = 'middle') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 / 100, -1 / 100);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillText(str, 0, 0);
  ctx.restore();
}

export function imageUp(ctx, img, x, y, w, h) {
  if (!img) return;
  ctx.save();
  ctx.translate(x, y + h);
  ctx.scale(1, -1);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
}

function outline(ctx, w = 0.03) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ---------------------------------------------------------------------------
// Obstacles. Origin: (e.x, e.y0) bottom-left of the collision box.
// ---------------------------------------------------------------------------
export function drawObstacle(ctx, e, t, env) {
  switch (e.k) {
    case 'cone':
      return cone(ctx);
    case 'barrier':
      return barrier(ctx, t);
    case 'drum':
      return drum(ctx, 0);
    case 'rollDrum':
      return drum(ctx, -(e.x - e.x0) / 0.575);
    case 'cable':
      return cable(ctx, t);
    case 'crate':
      return crate(ctx, e.w, e.y1 - e.y0, env.lang);
    case 'stack':
      return stack(ctx, t, env.lang, e.id);
    case 'container':
      return container(ctx, e.w, e.y1 - e.y0, e.id);
    case 'scaffold':
      return scaffold(ctx, e.w, e.y1);
    case 'beam':
      return beam(ctx, e, t, env.viewTop);
    case 'rack':
      return rack(ctx, e.w, e.y0);
    case 'birds':
      return birds(ctx, t, env.theme === 'port');
    case 'dropLoad':
      return dropLoad(ctx, e, env);
    case 'quad':
      return quad(ctx, e, t);
    default:
  }
}

function cone(ctx) {
  ctx.fillStyle = '#2A2C30';
  roundRect(ctx, -0.02, 0, 0.66, 0.08, 0.02);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.06, 0.07);
  ctx.lineTo(0.27, 0.78);
  ctx.quadraticCurveTo(0.31, 0.81, 0.35, 0.78);
  ctx.lineTo(0.56, 0.07);
  ctx.closePath();
  ctx.fillStyle = '#FF6A1A';
  ctx.fill();
  outline(ctx, 0.025);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#F4F4F4';
  ctx.fillRect(0, 0.28, 0.7, 0.12);
  ctx.fillRect(0, 0.52, 0.7, 0.09);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(0.2, 0.07, 0.07, 0.7);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0.42, 0.07, 0.2, 0.7);
  ctx.restore();
}

function barrier(ctx, t) {
  // legs
  ctx.strokeStyle = '#5A5F66';
  ctx.lineWidth = 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.1, 0);
  ctx.lineTo(0.22, 0.95);
  ctx.moveTo(0.35, 0);
  ctx.lineTo(0.22, 0.95);
  ctx.moveTo(1.0, 0);
  ctx.lineTo(1.13, 0.95);
  ctx.moveTo(1.25, 0);
  ctx.lineTo(1.13, 0.95);
  ctx.stroke();
  for (const [y, h] of [
    [0.58, 0.32],
    [0.22, 0.2],
  ]) {
    ctx.save();
    roundRect(ctx, 0, y, 1.35, h, 0.03);
    ctx.fillStyle = '#F2F2F2';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#D7322B';
    for (let x = -0.4; x < 1.6; x += 0.3) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.15, y);
      ctx.lineTo(x + 0.15 + h, y + h);
      ctx.lineTo(x + h, y + h);
      ctx.fill();
    }
    ctx.restore();
    roundRect(ctx, 0, y, 1.35, h, 0.03);
    outline(ctx, 0.025);
  }
  // warning lamp
  const on = Math.sin(t * 7) > 0;
  ctx.fillStyle = '#3A3A3A';
  ctx.fillRect(0.6, 0.9, 0.15, 0.06);
  ctx.beginPath();
  ctx.arc(0.675, 1.0, 0.07, 0, Math.PI * 2);
  ctx.fillStyle = on ? '#FFB020' : '#9A6A10';
  ctx.fill();
  outline(ctx, 0.02);
  if (on) {
    const g = ctx.createRadialGradient(0.675, 1.0, 0, 0.675, 1.0, 0.35);
    g.addColorStop(0, 'rgba(255,190,40,0.6)');
    g.addColorStop(1, 'rgba(255,190,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0.3, 0.65, 0.75, 0.7);
  }
}

function drum(ctx, rot) {
  const r = 0.575;
  ctx.save();
  ctx.translate(r, r);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#B57C45';
  ctx.fill();
  outline(ctx, 0.03);
  ctx.rotate(rot);
  ctx.strokeStyle = '#8A5A2E';
  ctx.lineWidth = 0.02;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
    ctx.lineTo(-Math.cos(a) * r * 0.95, -Math.sin(a) * r * 0.95);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.strokeStyle = '#8A5A2E';
  ctx.lineWidth = 0.04;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#2B2D31';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = BRAND_Y;
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 0.025, 0, Math.PI * 2);
    ctx.fillStyle = '#5A3A1E';
    ctx.fill();
  }
  ctx.restore();
  // cable wound around (visible top/bottom band)
  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, r * 0.72, 0, Math.PI * 2);
  ctx.clip();
  ctx.restore();
}

function cable(ctx, t) {
  // coil of cable lying on the road
  ctx.fillStyle = '#22252A';
  ctx.beginPath();
  ctx.ellipse(0.8, 0.12, 0.8, 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0.5 + i * 0.3, 0.2, 0.32, 0.18, 0, 0, Math.PI * 2);
    ctx.strokeStyle = i % 2 ? '#F07A1A' : '#2B2E33';
    ctx.lineWidth = 0.09;
    ctx.stroke();
  }
  // live end + sparks
  ctx.strokeStyle = '#B8742C';
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(1.4, 0.2);
  ctx.lineTo(1.55, 0.32);
  ctx.stroke();
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = t * 13 + i * 1.7;
    const len = 0.1 + 0.18 * Math.abs(Math.sin(a * 1.3));
    ctx.strokeStyle = i % 2 ? '#FFF6B0' : '#7FD3FF';
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(1.55, 0.32);
    ctx.lineTo(1.55 + Math.cos(a) * len, 0.32 + Math.abs(Math.sin(a)) * len);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(1.55, 0.32, 0, 1.55, 0.32, 0.45);
  g.addColorStop(0, 'rgba(140,210,255,0.7)');
  g.addColorStop(1, 'rgba(140,210,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(1.1, -0.1, 0.9, 0.9);
  // warning sign
  ctx.fillStyle = '#5A5F66';
  ctx.fillRect(0.05, 0, 0.04, 0.42);
  ctx.beginPath();
  ctx.moveTo(-0.1, 0.38);
  ctx.lineTo(0.07, 0.68);
  ctx.lineTo(0.24, 0.38);
  ctx.closePath();
  ctx.fillStyle = BRAND_Y;
  ctx.fill();
  outline(ctx, 0.02);
  textUp(ctx, '⚡', 0.07, 0.47, '700 16px sans-serif', '#1E1E1E');
}

/** Crate on a crane rope; a shadow on the road warns where it will land. */
function dropLoad(ctx, e, env) {
  const h = e.y1 - e.y0;
  if (e.y0 > 0.05) {
    const k = Math.max(0.15, 1 - e.y0 / 6);
    ctx.fillStyle = `rgba(0,0,0,${0.28 * k})`;
    ctx.beginPath();
    ctx.ellipse(e.w / 2, 0.03, (e.w / 2) * (0.6 + 0.4 * k), 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // crane rope and hook stay up there; the slings go with the crate until it lets go
  const hookY = (e.top0 ?? e.y0) + h + 0.6;
  ctx.strokeStyle = '#2E3238';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(e.w / 2, hookY);
  ctx.lineTo(e.w / 2, (env.viewTop || 12) + 2);
  if (!e.falling) {
    ctx.moveTo(0.15, e.y0 + h);
    ctx.lineTo(e.w / 2, hookY);
    ctx.lineTo(e.w - 0.15, e.y0 + h);
  }
  ctx.stroke();
  ctx.fillStyle = '#E0B800';
  ctx.beginPath();
  ctx.arc(e.w / 2, hookY + 0.08, 0.1, 0, Math.PI * 2);
  ctx.fill();
  outline(ctx, 0.02);
  ctx.save();
  ctx.translate(0, e.y0);
  crate(ctx, e.w, h, env.lang);
  ctx.restore();
}

/** Small inspection drone; its light blinks fast once it dives. */
function quad(ctx, e, t) {
  ctx.save();
  ctx.translate(0, e.y0);
  const w = e.w;
  // arms + rotors
  ctx.strokeStyle = '#2A2E35';
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(0.12, 0.42);
  ctx.lineTo(w - 0.12, 0.42);
  ctx.stroke();
  for (const x of [0.12, w - 0.12]) {
    ctx.fillStyle = 'rgba(200,210,220,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, 0.48, 0.24 * Math.abs(Math.cos(t * 40 + x)) + 0.04, 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // body
  ctx.fillStyle = '#3A4149';
  roundRect(ctx, w / 2 - 0.26, 0.12, 0.52, 0.3, 0.08);
  ctx.fill();
  outline(ctx, 0.02);
  ctx.fillStyle = '#FFD800';
  ctx.fillRect(w / 2 - 0.26, 0.24, 0.52, 0.05);
  // camera
  ctx.fillStyle = '#1A1E29';
  ctx.beginPath();
  ctx.arc(w / 2 - 0.12, 0.08, 0.07, 0, Math.PI * 2);
  ctx.fill();
  // warning light
  const on = e.diving ? Math.floor(t * 10) % 2 === 0 : Math.floor(t * 2) % 2 === 0;
  ctx.fillStyle = on ? '#FF3B30' : '#6B1D1A';
  ctx.beginPath();
  ctx.arc(w / 2 + 0.14, 0.36, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function crate(ctx, w, h, lang) {
  ctx.fillStyle = '#C9955A';
  roundRect(ctx, 0, 0, w, h, 0.03);
  ctx.fill();
  outline(ctx);
  ctx.fillStyle = '#B07E45';
  for (let y = 0.0; y < h; y += h / 4) ctx.fillRect(0.06, y + 0.02, w - 0.12, 0.025);
  ctx.strokeStyle = '#8E6131';
  ctx.lineWidth = 0.1;
  ctx.strokeRect(0.05, 0.05, w - 0.1, h - 0.1);
  ctx.beginPath();
  ctx.moveTo(0.1, 0.1);
  ctx.lineTo(w - 0.1, h - 0.1);
  ctx.stroke();
  textUp(ctx, 'MT GROUP', w / 2, h * 0.36, '800 22px "Barlow Condensed", sans-serif', 'rgba(40,30,20,0.75)');
  textUp(ctx, lang === 'lt' ? '↑ ATSARGIAI' : '↑ FRAGILE', w / 2, h * 0.68, '700 15px "Barlow Condensed", sans-serif', 'rgba(40,30,20,0.6)');
}

function stack(ctx, t, lang, id) {
  const wob = Math.sin(t * 3 + hash(id)) * 0.02;
  ctx.save();
  ctx.rotate(wob * 0.5);
  const colors = ['#E9E4D8', '#4F7CB8', '#E9E4D8', '#D8B45A', '#F2EFE8', '#C0563E', '#E9E4D8', '#6A9A6B', '#F2EFE8', '#4F7CB8', '#E9E4D8'];
  let y = 0;
  const h = 2.75 / colors.length;
  colors.forEach((c, i) => {
    const off = Math.sin(i * 2.3 + hash(id)) * 0.07;
    ctx.fillStyle = c;
    roundRect(ctx, 0.0 + off, y, 1.25, h - 0.01, 0.02);
    ctx.fill();
    outline(ctx, 0.018);
    if (c === '#E9E4D8' || c === '#F2EFE8') {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let k = 1; k < 4; k++) ctx.fillRect(0.05 + off, y + (k * h) / 4, 1.15, 0.008);
    }
    y += h;
  });
  // labels
  ctx.save();
  ctx.translate(0.62, 1.55);
  ctx.rotate(-0.08);
  ctx.fillStyle = '#FFE14A';
  ctx.fillRect(-0.48, -0.14, 0.96, 0.28);
  textUp(ctx, lang === 'lt' ? 'LEIDIMAI' : 'PERMITS', 0, 0, '800 20px "Barlow Condensed", sans-serif', '#1E1E1E');
  ctx.restore();
  ctx.save();
  ctx.translate(0.55, 0.62);
  ctx.rotate(0.06);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-0.42, -0.12, 0.84, 0.24);
  textUp(ctx, lang === 'lt' ? 'DERINTI' : 'APPROVE', 0, 0, '800 16px "Barlow Condensed", sans-serif', '#C0392B');
  ctx.restore();
  // flying sheet
  const ph = (t * 0.8 + hash(id) * 0.01) % 1;
  ctx.save();
  ctx.translate(0.6 - ph * 1.2, 2.8 + Math.sin(ph * 6) * 0.25 + ph * 0.4);
  ctx.rotate(ph * 4);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-0.12, -0.08, 0.24, 0.16);
  ctx.restore();
  ctx.restore();
}

const CONTAINER_COLORS = [
  { c: BRAND_Y, logo: true },
  { c: '#2E5E8E' },
  { c: '#A63A2C' },
  { c: '#3B7A57' },
  { c: '#E07B28' },
];

function container(ctx, w, h, id) {
  const st = CONTAINER_COLORS[hash(id) % CONTAINER_COLORS.length];
  ctx.fillStyle = st.c;
  ctx.fillRect(0, 0, w, h);
  // corrugation
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = 0.12; x < w; x += 0.24) ctx.fillRect(x, 0.12, 0.08, h - 0.24);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let x = 0.04; x < w; x += 0.24) ctx.fillRect(x, 0.12, 0.04, h - 0.24);
  // frame
  ctx.fillStyle = shade(st.c, -0.3);
  ctx.fillRect(0, 0, w, 0.12);
  ctx.fillRect(0, h - 0.12, w, 0.12);
  ctx.fillRect(0, 0, 0.14, h);
  ctx.fillRect(w - 0.14, 0, 0.14, h);
  // door bars
  ctx.fillStyle = shade(st.c, -0.4);
  for (const x of [w - 0.5, w - 0.85]) ctx.fillRect(x, 0.15, 0.05, h - 0.3);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.03;
  ctx.strokeRect(0, 0, w, h);
  if (st.logo) {
    const img = IMAGES.logo;
    if (img) {
      const lh = 0.9;
      const lw = (img.width / img.height) * lh;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(0.5, h / 2 - lh / 2 - 0.08, lw + 0.2, lh + 0.16);
      imageUp(ctx, img, 0.6, h / 2 - lh / 2, lw, lh);
    }
  } else {
    textUp(ctx, 'MTGU ' + String(100000 + (hash(id) % 899999)), 1.0, h - 0.4, '700 20px "Barlow Condensed", sans-serif', 'rgba(255,255,255,0.8)', 'left');
  }
}

function scaffold(ctx, w, top) {
  // poles (behind: lighter) and planks on top
  ctx.strokeStyle = '#8D949C';
  ctx.lineWidth = 0.07;
  const n = Math.max(2, Math.round(w / 3));
  for (let i = 0; i <= n; i++) {
    const x = (i * w) / n;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, top + 1.0);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(141,148,156,0.6)';
  ctx.lineWidth = 0.04;
  for (let i = 0; i < n; i++) {
    const x0 = (i * w) / n;
    const x1 = ((i + 1) * w) / n;
    ctx.beginPath();
    ctx.moveTo(x0, top + 0.95);
    ctx.lineTo(x1, top + 0.95);
    ctx.stroke();
  }
  ctx.fillStyle = '#C08A4C';
  ctx.fillRect(0, top - 0.28, w, 0.28);
  ctx.fillStyle = '#A97640';
  for (let x = 0; x < w; x += 1.2) ctx.fillRect(x, top - 0.28, 0.03, 0.28);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.025;
  ctx.strokeRect(0, top - 0.28, w, 0.28);
  // hazard toe board
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top - 0.42, w, 0.14);
  ctx.clip();
  for (let x = -0.3; x < w; x += 0.3) {
    ctx.fillStyle = Math.round(x / 0.3) % 2 ? BRAND_Y : BRAND_K;
    ctx.beginPath();
    ctx.moveTo(x, top - 0.42);
    ctx.lineTo(x + 0.15, top - 0.42);
    ctx.lineTo(x + 0.3, top - 0.28);
    ctx.lineTo(x + 0.15, top - 0.28);
    ctx.fill();
  }
  ctx.restore();
}

function beam(ctx, e, t, viewTop) {
  const sw = Math.sin(t * 1.6 + e.x) * 0.04;
  const y0 = e.y0;
  const h = 0.48;
  ctx.save();
  ctx.translate(e.w / 2, y0 + h);
  ctx.rotate(sw);
  ctx.translate(-e.w / 2, -(y0 + h));
  // cables
  ctx.strokeStyle = '#2E3238';
  ctx.lineWidth = 0.035;
  const hookY = y0 + h + 0.9;
  ctx.beginPath();
  ctx.moveTo(0.2, y0 + h);
  ctx.lineTo(e.w / 2, hookY);
  ctx.lineTo(e.w - 0.2, y0 + h);
  ctx.moveTo(e.w / 2, hookY);
  ctx.lineTo(e.w / 2, (viewTop || 12) + 2);
  ctx.stroke();
  ctx.fillStyle = '#E0B800';
  ctx.beginPath();
  ctx.arc(e.w / 2, hookY + 0.08, 0.1, 0, Math.PI * 2);
  ctx.fill();
  outline(ctx, 0.02);
  // I-beam
  ctx.fillStyle = '#4C5560';
  ctx.fillRect(0, y0, e.w, 0.1);
  ctx.fillRect(0, y0 + h - 0.1, e.w, 0.1);
  ctx.fillStyle = '#3A4149';
  ctx.fillRect(0.05, y0 + 0.1, e.w - 0.1, h - 0.2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(0, y0 + h - 0.05, e.w, 0.03);
  // hazard ends
  for (const x of [0, e.w - 0.3]) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y0, 0.3, h);
    ctx.clip();
    for (let k = -1; k < 4; k++) {
      ctx.fillStyle = k % 2 ? BRAND_Y : BRAND_K;
      ctx.beginPath();
      ctx.moveTo(x + k * 0.15, y0);
      ctx.lineTo(x + k * 0.15 + 0.15, y0);
      ctx.lineTo(x + k * 0.15 + 0.15 + h, y0 + h);
      ctx.lineTo(x + k * 0.15 + h, y0 + h);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.025;
  ctx.strokeRect(0, y0, e.w, h);
  ctx.restore();
}

function rack(ctx, w, y0) {
  // support frames at both ends (behind the path)
  ctx.fillStyle = '#7C858F';
  for (const x of [0.1, w - 0.35]) {
    ctx.fillRect(x, 0, 0.25, y0 + 2.4);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + 0.15, 0, 0.1, y0 + 2.4);
    ctx.fillStyle = '#7C858F';
  }
  ctx.fillStyle = '#6A737D';
  ctx.fillRect(0, y0 + 2.2, w, 0.25);
  // truss
  ctx.strokeStyle = '#6A737D';
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  for (let x = 0; x < w - 0.5; x += 0.8) {
    ctx.moveTo(x, y0 + 1.25);
    ctx.lineTo(x + 0.4, y0 + 2.2);
    ctx.lineTo(x + 0.8, y0 + 1.25);
  }
  ctx.stroke();
  // pipes
  const pipes = [
    [y0 + 0.22, 0.22, '#F2C200'],
    [y0 + 0.62, 0.2, '#9AA3AD'],
    [y0 + 1.0, 0.16, '#3F78B5'],
  ];
  for (const [cy, r, col] of pipes) {
    ctx.fillStyle = col;
    ctx.fillRect(-0.2, cy - r, w + 0.4, r * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(-0.2, cy + r * 0.35, w + 0.4, r * 0.3);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(-0.2, cy - r, w + 0.4, r * 0.4);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.02;
    ctx.strokeRect(-0.2, cy - r, w + 0.4, r * 2);
    ctx.fillStyle = shade(col, -0.25);
    for (let x = 1.5; x < w; x += 3) ctx.fillRect(x, cy - r - 0.02, 0.12, r * 2 + 0.04);
  }
  // flow arrows on gas pipe
  textUp(ctx, 'GAS →', 1.2, y0 + 0.22, '800 13px "Barlow Condensed", sans-serif', '#1E1E1E');
  // hazard band at clearance height
  ctx.save();
  ctx.beginPath();
  ctx.rect(-0.2, y0 - 0.1, w + 0.4, 0.1);
  ctx.clip();
  for (let x = -0.3; x < w + 0.4; x += 0.3) {
    ctx.fillStyle = Math.round(x / 0.3) % 2 ? BRAND_Y : BRAND_K;
    ctx.fillRect(x, y0 - 0.1, 0.15, 0.1);
  }
  ctx.restore();
}

function birds(ctx, t, gulls) {
  const body = gulls ? '#F4F4F2' : '#8C939C';
  const wing = gulls ? '#C9CED4' : '#6C737C';
  const pos = [
    [0.2, 0.25, 0],
    [0.9, 0.55, 1.3],
    [1.45, 0.15, 2.1],
  ];
  for (const [x, y, ph] of pos) {
    const f = Math.sin(t * 16 + ph);
    ctx.save();
    ctx.translate(x, DIM_BIRD_Y0 + 0.15 + y * 0.8 + 0.08 * Math.sin(t * 3 + ph));
    ctx.scale(-1.6, 1.6); // facing left (towards the player)
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.22, 0.09, 0, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();
    outline(ctx, 0.018);
    ctx.beginPath();
    ctx.arc(0.2, 0.06, 0.07, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();
    outline(ctx, 0.015);
    ctx.fillStyle = '#F2A81D';
    ctx.beginPath();
    ctx.moveTo(0.26, 0.06);
    ctx.lineTo(0.36, 0.04);
    ctx.lineTo(0.26, 0.02);
    ctx.fill();
    ctx.fillStyle = '#1A1E29';
    ctx.beginPath();
    ctx.arc(0.22, 0.08, 0.012, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.05, 0.03);
    ctx.quadraticCurveTo(0.0, 0.03 + 0.3 * f, -0.2, 0.06 + 0.35 * f);
    ctx.lineTo(-0.12, 0.02);
    ctx.closePath();
    ctx.fillStyle = wing;
    ctx.fill();
    outline(ctx, 0.015);
    ctx.restore();
  }
}
const DIM_BIRD_Y0 = 1.22;

// ---------------------------------------------------------------------------
// Pit / trench. Origin (e.x, 0). Drawn over the ground cross-section.
// ---------------------------------------------------------------------------
export function drawPit(ctx, w, depth, soil) {
  ctx.fillStyle = shade(soil, -0.45);
  ctx.fillRect(0, -depth, w, depth);
  const g = ctx.createLinearGradient(0, 0, 0, -depth);
  g.addColorStop(0, 'rgba(0,0,0,0.15)');
  g.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = g;
  ctx.fillRect(0, -depth, w, depth);
  // cut pipes visible in the walls
  ctx.fillStyle = '#F2C200';
  ctx.fillRect(0, -0.9, 0.14, 0.22);
  ctx.fillRect(w - 0.14, -0.9, 0.14, 0.22);
  ctx.fillStyle = '#3F78B5';
  ctx.fillRect(0, -1.45, 0.12, 0.18);
  ctx.fillRect(w - 0.12, -1.45, 0.12, 0.18);
  // edges
  ctx.fillStyle = shade(soil, -0.2);
  ctx.fillRect(-0.06, -0.1, 0.12, 0.1);
  ctx.fillRect(w - 0.06, -0.1, 0.12, 0.1);
  // warning posts at both edges
  for (const x of [-0.35, w + 0.22]) {
    ctx.fillStyle = '#E8E8E8';
    ctx.fillRect(x, 0, 0.12, 0.62);
    ctx.fillStyle = '#E2362B';
    ctx.fillRect(x, 0.15, 0.12, 0.12);
    ctx.fillRect(x, 0.4, 0.12, 0.12);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.02;
    ctx.strokeRect(x, 0, 0.12, 0.62);
  }
}

// ---------------------------------------------------------------------------
// Pickups. Origin = centre.
// ---------------------------------------------------------------------------
export function drawBolt(ctx, t, glow = true) {
  const spin = Math.cos(t * 3.2);
  ctx.save();
  if (glow) {
    // bright halo so bolts pop out of any background (day or night)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.62);
    g.addColorStop(0, 'rgba(255,250,200,0.95)');
    g.addColorStop(0.35, 'rgba(255,224,40,0.6)');
    g.addColorStop(1, 'rgba(255,200,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-0.62, -0.62, 1.24, 1.24);
  }
  ctx.scale((0.6 + 0.4 * Math.abs(spin)) * 1.22, 1.22);
  ctx.beginPath();
  ctx.moveTo(0.05, 0.32);
  ctx.lineTo(-0.17, -0.02);
  ctx.lineTo(-0.01, -0.02);
  ctx.lineTo(-0.07, -0.32);
  ctx.lineTo(0.17, 0.05);
  ctx.lineTo(0.01, 0.05);
  ctx.lineTo(0.09, 0.32);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2A1F00';
  ctx.lineWidth = 0.075;
  ctx.stroke();
  ctx.fillStyle = spin > 0 ? '#FFE600' : '#FFD000';
  ctx.fill();
  ctx.strokeStyle = '#FFFBD6';
  ctx.lineWidth = 0.022;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(0.045, 0.26);
  ctx.lineTo(-0.1, 0.0);
  ctx.lineTo(-0.045, 0.0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawToken(ctx, t) {
  const s = Math.cos(t * 2.4);
  ctx.save();
  const g = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 0.75);
  g.addColorStop(0, 'rgba(255,220,90,0.6)');
  g.addColorStop(1, 'rgba(255,220,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-0.75, -0.75, 1.5, 1.5);
  ctx.scale(Math.max(0.12, Math.abs(s)), 1);
  ctx.beginPath();
  ctx.arc(0, 0, 0.36, 0, Math.PI * 2);
  ctx.fillStyle = s > 0 ? '#F2C230' : '#D9A520';
  ctx.fill();
  ctx.strokeStyle = '#8A6000';
  ctx.lineWidth = 0.035;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 0.29, 0, Math.PI * 2);
  ctx.fillStyle = BRAND_K;
  ctx.fill();
  if (s > 0) imageUp(ctx, IMAGES.emblem, -0.17, -0.185, 0.34 * (217 / 238), 0.34);
  ctx.restore();
}

const POWER_COLORS = { magnet: '#E2364B', drone: '#3FA9F5', excavator: '#F5A623', double: '#34B37A', helmet: '#FFD800' };

export function drawPower(ctx, kind, t) {
  const col = POWER_COLORS[kind] || '#FFFFFF';
  const pulse = 1 + 0.06 * Math.sin(t * 5);
  ctx.save();
  ctx.scale(pulse, pulse);
  const g = ctx.createRadialGradient(0, 0, 0.2, 0, 0, 0.75);
  g.addColorStop(0, `${col}AA`);
  g.addColorStop(1, `${col}00`);
  ctx.fillStyle = g;
  ctx.fillRect(-0.75, -0.75, 1.5, 1.5);
  ctx.beginPath();
  ctx.arc(0, 0, 0.42, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.lineWidth = 0.06;
  ctx.strokeStyle = col;
  ctx.stroke();
  drawPowerIcon(ctx, kind, 0.3);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-0.17, 0.2, 0.09, 0.05, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Icon in a box of +-r (y up). Also used by the HUD (via canvas). */
export function drawPowerIcon(ctx, kind, r) {
  ctx.save();
  ctx.scale(r / 0.3, r / 0.3);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (kind) {
    case 'magnet': {
      ctx.lineWidth = 0.13;
      ctx.strokeStyle = '#E2364B';
      ctx.beginPath();
      ctx.arc(0, 0.02, 0.15, Math.PI, 0, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.15, 0.02);
      ctx.lineTo(-0.15, 0.2);
      ctx.moveTo(0.15, 0.02);
      ctx.lineTo(0.15, 0.2);
      ctx.stroke();
      ctx.strokeStyle = '#D8DDE2';
      ctx.beginPath();
      ctx.moveTo(-0.15, 0.17);
      ctx.lineTo(-0.15, 0.24);
      ctx.moveTo(0.15, 0.17);
      ctx.lineTo(0.15, 0.24);
      ctx.stroke();
      break;
    }
    case 'drone': {
      ctx.fillStyle = '#2C2F36';
      ctx.fillRect(-0.24, 0.02, 0.48, 0.04);
      ctx.fillStyle = '#3FA9F5';
      ctx.beginPath();
      ctx.ellipse(0, 0.0, 0.11, 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(44,47,54,0.7)';
      for (const x of [-0.22, 0.22]) {
        ctx.beginPath();
        ctx.ellipse(x, 0.1, 0.11, 0.025, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#2C2F36';
      ctx.fillRect(-0.04, -0.15, 0.08, 0.1);
      break;
    }
    case 'excavator': {
      ctx.fillStyle = '#2B2D31';
      roundRect(ctx, -0.24, -0.22, 0.34, 0.09, 0.04);
      ctx.fill();
      ctx.fillStyle = '#F5A623';
      ctx.fillRect(-0.22, -0.13, 0.3, 0.13);
      ctx.fillRect(-0.18, 0.0, 0.14, 0.14);
      ctx.strokeStyle = '#F5A623';
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.moveTo(0.06, -0.04);
      ctx.lineTo(0.18, 0.14);
      ctx.lineTo(0.25, -0.08);
      ctx.stroke();
      ctx.fillStyle = '#2B2D31';
      ctx.beginPath();
      ctx.moveTo(0.2, -0.06);
      ctx.lineTo(0.3, -0.06);
      ctx.lineTo(0.27, -0.2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'double': {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#34B37A';
      ctx.lineWidth = 0.03;
      ctx.fillRect(-0.18, -0.24, 0.36, 0.46);
      ctx.strokeRect(-0.18, -0.24, 0.36, 0.46);
      textUp(ctx, 'x2', 0, 0.0, '900 30px "Barlow Condensed", sans-serif', '#34B37A');
      ctx.strokeStyle = '#34B37A';
      ctx.beginPath();
      ctx.moveTo(-0.1, -0.17);
      ctx.lineTo(0.1, -0.17);
      ctx.stroke();
      break;
    }
    case 'helmet': {
      ctx.fillStyle = '#FFD800';
      ctx.beginPath();
      ctx.moveTo(-0.22, -0.06);
      ctx.bezierCurveTo(-0.22, 0.26, 0.22, 0.26, 0.22, -0.06);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8A6A00';
      ctx.lineWidth = 0.03;
      ctx.stroke();
      ctx.fillStyle = '#E0B800';
      ctx.fillRect(-0.28, -0.11, 0.56, 0.06);
      ctx.fillStyle = '#E0B800';
      ctx.fillRect(-0.03, -0.06, 0.06, 0.24);
      break;
    }
    default:
  }
  ctx.restore();
}

export function drawTask(ctx, t) {
  const b = Math.sin(t * 6) * 0.05;
  ctx.save();
  ctx.translate(0, b);
  const g = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 0.8);
  g.addColorStop(0, 'rgba(255,140,40,0.55)');
  g.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-0.8, -0.8, 1.6, 1.6);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#FF8A1F';
  roundRect(ctx, -0.32, -0.32, 0.64, 0.64, 0.08);
  ctx.fill();
  ctx.strokeStyle = '#1E1E1E';
  ctx.lineWidth = 0.05;
  ctx.stroke();
  ctx.rotate(-Math.PI / 4);
  // wrench
  ctx.strokeStyle = '#1E1E1E';
  ctx.lineWidth = 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.14, -0.14);
  ctx.lineTo(0.08, 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0.12, 0.12, 0.09, -2.4, 1.6);
  ctx.stroke();
  ctx.restore();
}

// Project part icons per project type (origin centre, ~0.35 m)
export function drawPart(ctx, type, t, idx = 0) {
  const pulse = 1 + 0.07 * Math.sin(t * 4 + idx);
  ctx.save();
  ctx.scale(pulse, pulse);
  const g = ctx.createRadialGradient(0, 0, 0.15, 0, 0, 0.8);
  g.addColorStop(0, 'rgba(120,220,255,0.55)');
  g.addColorStop(1, 'rgba(120,220,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-0.8, -0.8, 1.6, 1.6);
  ctx.beginPath();
  ctx.arc(0, 0, 0.42, 0, Math.PI * 2);
  ctx.fillStyle = '#1E2A3A';
  ctx.fill();
  ctx.lineWidth = 0.06;
  ctx.strokeStyle = BRAND_Y;
  ctx.stroke();
  partIcon(ctx, type);
  ctx.restore();
}

export function partIcon(ctx, type) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const Y = BRAND_Y;
  const W = '#FFFFFF';
  switch (type) {
    case 'solar':
      ctx.fillStyle = '#3F78B5';
      ctx.beginPath();
      ctx.moveTo(-0.24, -0.12);
      ctx.lineTo(0.2, -0.12);
      ctx.lineTo(0.26, 0.14);
      ctx.lineTo(-0.18, 0.14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = W;
      ctx.lineWidth = 0.02;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.02, -0.12);
      ctx.lineTo(0.04, 0.14);
      ctx.moveTo(-0.21, 0.01);
      ctx.lineTo(0.23, 0.01);
      ctx.stroke();
      ctx.fillStyle = Y;
      ctx.beginPath();
      ctx.arc(0.18, 0.24, 0.06, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'offshorewind':
    case 'wind':
      ctx.strokeStyle = W;
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(0, -0.28);
      ctx.lineTo(0, 0.06);
      ctx.stroke();
      ctx.lineWidth = 0.04;
      for (let i = 0; i < 3; i++) {
        const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.moveTo(0, 0.08);
        ctx.lineTo(Math.cos(a) * 0.24, 0.08 + Math.sin(a) * 0.24);
        ctx.stroke();
      }
      ctx.fillStyle = Y;
      ctx.beginPath();
      ctx.arc(0, 0.08, 0.04, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bess':
      ctx.fillStyle = W;
      roundRect(ctx, -0.13, -0.24, 0.26, 0.42, 0.04);
      ctx.fill();
      ctx.fillRect(-0.05, 0.18, 0.1, 0.05);
      ctx.fillStyle = '#34B37A';
      ctx.fillRect(-0.09, -0.2, 0.18, 0.12);
      ctx.fillRect(-0.09, -0.06, 0.18, 0.1);
      ctx.fillStyle = Y;
      ctx.fillRect(-0.09, 0.06, 0.18, 0.08);
      break;
    case 'hydrogen':
      ctx.fillStyle = W;
      roundRect(ctx, -0.12, -0.26, 0.24, 0.46, 0.11);
      ctx.fill();
      ctx.fillStyle = '#1E2A3A';
      ctx.fillRect(-0.05, 0.2, 0.1, 0.06);
      textUp(ctx, 'H₂', 0, -0.03, '800 15px "Barlow Condensed", sans-serif', '#1E6FB0');
      break;
    case 'lng':
    case 'gas':
      ctx.strokeStyle = Y;
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.arc(0, 0.05, 0.17, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(0, 0.05);
        ctx.lineTo(Math.cos(a) * 0.17, 0.05 + Math.sin(a) * 0.17);
        ctx.stroke();
      }
      ctx.fillStyle = W;
      ctx.fillRect(-0.04, -0.28, 0.08, 0.18);
      ctx.fillRect(-0.2, -0.3, 0.4, 0.06);
      if (type === 'lng') textUp(ctx, 'LNG', 0, 0.05, '800 10px "Barlow Condensed", sans-serif', W);
      break;
    case 'pipeline':
      ctx.fillStyle = Y;
      ctx.fillRect(-0.26, -0.1, 0.52, 0.2);
      ctx.fillStyle = '#C9A200';
      ctx.fillRect(-0.12, -0.13, 0.06, 0.26);
      ctx.fillRect(0.08, -0.13, 0.06, 0.26);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(-0.26, 0.03, 0.52, 0.04);
      break;
    case 'ccs':
      ctx.fillStyle = W;
      ctx.fillRect(-0.2, -0.26, 0.14, 0.4);
      ctx.fillRect(0.02, -0.26, 0.18, 0.3);
      textUp(ctx, 'CO₂', 0.0, 0.2, '800 11px "Barlow Condensed", sans-serif', Y);
      break;
    case 'biogas':
      ctx.fillStyle = '#6FBF5A';
      ctx.beginPath();
      ctx.ellipse(0, -0.12, 0.25, 0.25, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = W;
      ctx.fillRect(-0.26, -0.18, 0.52, 0.06);
      ctx.fillStyle = Y;
      ctx.beginPath();
      ctx.moveTo(0.0, 0.26);
      ctx.quadraticCurveTo(0.1, 0.18, 0.0, 0.12);
      ctx.quadraticCurveTo(-0.1, 0.18, 0.0, 0.26);
      ctx.fill();
      break;
    case 'substation':
    default:
      ctx.strokeStyle = W;
      ctx.lineWidth = 0.035;
      ctx.beginPath();
      ctx.moveTo(-0.16, -0.27);
      ctx.lineTo(0, 0.27);
      ctx.lineTo(0.16, -0.27);
      ctx.moveTo(-0.2, 0.12);
      ctx.lineTo(0.2, 0.12);
      ctx.moveTo(-0.14, -0.05);
      ctx.lineTo(0.14, -0.05);
      ctx.moveTo(-0.11, 0.12);
      ctx.lineTo(0.08, -0.05);
      ctx.stroke();
      ctx.fillStyle = Y;
      ctx.beginPath();
      ctx.moveTo(0.02, 0.06);
      ctx.lineTo(-0.06, -0.06);
      ctx.lineTo(0.0, -0.06);
      ctx.lineTo(-0.03, -0.17);
      ctx.lineTo(0.07, -0.03);
      ctx.lineTo(0.01, -0.03);
      ctx.closePath();
      ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// City entry sign. Origin: post base (x, 0).
// ---------------------------------------------------------------------------
export function drawCitySign(ctx, city, lang) {
  ctx.fillStyle = '#7E868F';
  ctx.fillRect(-0.06, 0, 0.12, 2.6);
  ctx.fillRect(1.94, 0, 0.12, 2.6);
  ctx.fillStyle = '#F4F4F4';
  roundRect(ctx, -0.35, 2.3, 2.7, 1.25, 0.08);
  ctx.fill();
  ctx.strokeStyle = '#1F5FA8';
  ctx.lineWidth = 0.07;
  roundRect(ctx, -0.27, 2.38, 2.54, 1.09, 0.06);
  ctx.stroke();
  textUp(ctx, city.name[lang].toUpperCase(), 1.0, 2.98, '800 46px "Barlow Condensed", sans-serif', '#1F2A3A');
  textUp(ctx, `${city.flag}  ${city.country[lang]}`, 1.0, 2.6, '600 20px "Barlow", sans-serif', '#3A4656');
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.025;
  roundRect(ctx, -0.35, 2.3, 2.7, 1.25, 0.08);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Project gate. Origin (gateX, 0). `lit` 0..1 switches the facility on.
// ---------------------------------------------------------------------------
export function drawGateSign(ctx, city, lang, lit, t, stars) {
  // switch cabinet on the road side
  ctx.fillStyle = '#5E6670';
  ctx.fillRect(-0.4, 0, 0.8, 1.25);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.03;
  ctx.strokeRect(-0.4, 0, 0.8, 1.25);
  ctx.fillStyle = BRAND_Y;
  ctx.beginPath();
  ctx.moveTo(-0.2, 0.75);
  ctx.lineTo(0.0, 1.1);
  ctx.lineTo(0.2, 0.75);
  ctx.closePath();
  ctx.fill();
  textUp(ctx, '⚡', 0, 0.86, '800 13px sans-serif', '#1E1E1E');
  // lever
  const ang = lit > 0 ? -0.9 : 0.9;
  ctx.save();
  ctx.translate(0.0, 0.5);
  ctx.rotate(ang);
  ctx.fillStyle = '#C9CED4';
  ctx.fillRect(-0.04, 0, 0.08, 0.55);
  ctx.beginPath();
  ctx.arc(0, 0.58, 0.09, 0, Math.PI * 2);
  ctx.fillStyle = lit > 0 ? '#34B37A' : '#E2364B';
  ctx.fill();
  ctx.restore();
  // overhead banner gantry
  ctx.fillStyle = '#3A3F46';
  ctx.fillRect(-3.2, 0, 0.18, 5.2);
  ctx.fillRect(3.0, 0, 0.18, 5.2);
  ctx.fillStyle = BRAND_K;
  roundRect(ctx, -3.5, 4.0, 7.0, 1.35, 0.1);
  ctx.fill();
  ctx.fillStyle = lit > 0 ? '#34B37A' : BRAND_Y;
  ctx.fillRect(-3.5, 4.0, 7.0, 0.14);
  textUp(ctx, city.project[lang], 0, 4.85, '800 34px "Barlow Condensed", sans-serif', '#FFFFFF');
  const label = lit > 0 ? (lang === 'lt' ? 'PROJEKTAS PALEISTAS' : 'PROJECT ONLINE') : lang === 'lt' ? 'PALEISK PROJEKTĄ' : 'BRING IT ONLINE';
  textUp(ctx, label, 0, 4.4, '700 18px "Barlow Condensed", sans-serif', lit > 0 ? '#7CF0B0' : BRAND_Y);
  // stars
  for (let i = 0; i < 3; i++) starShape(ctx, 2.55 + i * 0.0, 4.65, 0, 0);
  for (let i = 0; i < 3; i++) {
    const on = lit > 0 ? i < stars : false;
    starShape(ctx, -2.95 + i * 0.38, 4.65, 0.15, on ? BRAND_Y : 'rgba(255,255,255,0.25)');
  }
  // running lights along the bottom edge
  for (let i = 0; i < 14; i++) {
    const on = lit > 0 && Math.sin(t * 8 - i * 0.6) > 0;
    ctx.fillStyle = on ? '#FFF2A8' : '#4A4A4A';
    ctx.beginPath();
    ctx.arc(-3.2 + i * 0.49, 4.07, 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function starShape(ctx, x, y, r, col) {
  if (!r) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.restore();
}
