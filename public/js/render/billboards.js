// Birthday wishes for Mindaugas: a small plane tows a banner across the sky.
// It sits on a slow parallax layer (like distant clouds), so it stays on screen
// for several seconds even at full speed. Purely visual: no effect on the run.
import { hashString } from '/shared/rng.js';
import { cityStart, cityLength, CITIES } from '/shared/config.js';

// short on purpose: one line, readable at a glance
export const GREETINGS = [
  { lt: 'Mindaugai – su gimtadieniu!', en: 'Mindaugas – happy birthday!' }, // always the first one a player sees
  { lt: 'Daugiau metų – daugiau kilovatų!', en: 'More years, more kilowatts!' },
  { lt: 'Ilgiausių metų, Mindaugai!', en: 'Many happy returns, Mindaugas!' },
  { lt: 'Energijos – kaip visam tinklui!', en: 'Energy for the whole grid!' },
  { lt: 'Tu – mūsų stipriausia srovė!', en: 'You are our strongest current!' },
  { lt: 'Šalmas, tortas – saugu ir skanu!', en: 'Helmet on, cake in hand!' },
  { lt: 'Projektas „Dar vieni metai“ – priduotas!', en: 'Project “One more year”: delivered!' },
  { lt: 'Nuo Vilniaus iki Hamburgo – sveikinam!', en: 'From Vilnius to Hamburg: cheers!' },
  { lt: 'Visa komanda bėga kartu su Tavim!', en: 'The whole team runs with you!' },
  { lt: 'Įtampa – tik laiduose. Šventė – visur!', en: 'Tension only in the cables today!' },
];

// candidate flyover spots (share of the leg between two cities); the first two
// that keep clear of the city / checkpoint banners are used
const NEXT_KEY = 'mter.nextWish';
let memNext = 0; // fallback when storage is blocked

/** The next wish for this player: 0 (the birthday wish) first, then the others in turn. */
export function nextWish() {
  let n = memNext;
  try {
    n = Number(localStorage.getItem(NEXT_KEY)) || 0;
  } catch {
    /* private mode */
  }
  memNext = n + 1;
  try {
    localStorage.setItem(NEXT_KEY, String(memNext));
  } catch {
    /* private mode */
  }
  return n % GREETINGS.length;
}

const SPOTS = [0.25, 0.45, 0.65, 0.85];
const CLEAR = 80; // meters away from a city start, checkpoint or the next city
export const PARALLAX = 0.22; // the banner moves at 22 % of the road speed on screen

/** Flyovers whose banner may be on screen: [{ x, idx }] (x = road meter where it is centred). */
export function bannersNear(seed, x, range) {
  const out = [];
  const base = hashString(String(seed));
  for (let ci = 0; cityStart(ci) < x + range; ci++) {
    const s = cityStart(ci);
    const len = cityLength(ci);
    if (s + len < x - range) continue;
    const busy = [s, s + len, ...(CITIES[ci % CITIES.length].waypoints || []).map((w) => s + w.from)];
    const spots = SPOTS.map((f) => s + len * f).filter((bx) => busy.every((b) => Math.abs(bx - b) >= CLEAR)).slice(0, 2);
    spots.forEach((bx, k) => {
      if (Math.abs(bx - x) < range) out.push({ x: bx, idx: (base + ci * 2 + k) % GREETINGS.length });
    });
  }
  return out;
}

/**
 * Plane + banner in screen pixels. (cx, cy) = centre of the banner, u = unit size
 * in pixels (banner text height), t = time (flutter).
 */
export function drawSkyBanner(ctx, idx, lang, cx, cy, u, t) {
  const g = GREETINGS[idx % GREETINGS.length];
  const text = g[lang] || g.lt;
  ctx.save();
  ctx.font = `800 ${Math.round(u)}px "Barlow Condensed", sans-serif`;
  const tw = ctx.measureText(text).width;
  const bw = tw + u * 1.6;
  const bh = u * 1.55;
  const x0 = cx - bw / 2;
  const y0 = cy - bh / 2;
  // the banner flutters: a gentle wave along its length
  const wave = (x) => Math.sin(t * 5 + (x - x0) / (u * 2.2)) * u * 0.12;
  const seg = 16;
  const strip = (off, h, fill) => {
    ctx.beginPath();
    for (let i = 0; i <= seg; i++) {
      const x = x0 + (bw * i) / seg;
      ctx.lineTo(x, y0 + off + wave(x));
    }
    for (let i = seg; i >= 0; i--) {
      const x = x0 + (bw * i) / seg;
      ctx.lineTo(x, y0 + off + h + wave(x));
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = u * 0.3;
  strip(0, bh, '#FFFFFF');
  ctx.shadowBlur = 0;
  strip(0, u * 0.14, '#FFD800');
  strip(bh - u * 0.14, u * 0.14, '#FFD800');
  // text follows the wave at the middle of the banner
  ctx.fillStyle = '#1F2A3A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + wave(cx));

  // tow rope and the plane ahead of the banner (flying the same way as the hero)
  const px = x0 + bw + u * 2.4;
  const py = cy - u * 0.4 + Math.sin(t * 2) * u * 0.1;
  ctx.strokeStyle = 'rgba(40,40,40,0.7)';
  ctx.lineWidth = Math.max(1, u * 0.05);
  ctx.beginPath();
  ctx.moveTo(x0 + bw, y0 + wave(x0 + bw) + u * 0.1);
  ctx.lineTo(px - u * 1.1, py);
  ctx.moveTo(x0 + bw, y0 + bh + wave(x0 + bw) - u * 0.1);
  ctx.lineTo(px - u * 1.1, py);
  ctx.stroke();
  drawPlane(ctx, px, py, u, t);
  ctx.restore();
}

function drawPlane(ctx, x, y, u, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
  // tail fin
  ctx.fillStyle = '#E2BE00';
  ctx.beginPath();
  ctx.moveTo(-1.2, -0.05);
  ctx.lineTo(-1.05, -0.65);
  ctx.lineTo(-0.75, -0.65);
  ctx.lineTo(-0.6, -0.05);
  ctx.closePath();
  ctx.fill();
  // fuselage
  ctx.fillStyle = '#FFD800';
  ctx.beginPath();
  ctx.ellipse(0, 0, 1.3, 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // cockpit window
  ctx.fillStyle = '#6FB6E8';
  ctx.beginPath();
  ctx.ellipse(0.55, -0.16, 0.3, 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  // wing
  ctx.fillStyle = '#E2BE00';
  ctx.beginPath();
  ctx.ellipse(-0.05, 0.1, 0.55, 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // MT on the side
  ctx.fillStyle = '#1E1E1E';
  ctx.font = '800 0.34px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MT', -0.35, 0.02);
  // spinning propeller
  ctx.fillStyle = 'rgba(60,60,60,0.55)';
  const k = Math.abs(Math.sin(t * 40));
  ctx.fillRect(1.28, -0.45 * k - 0.05, 0.07, 0.9 * k + 0.1);
  ctx.fillStyle = '#3A3A3A';
  ctx.beginPath();
  ctx.arc(1.32, 0, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
