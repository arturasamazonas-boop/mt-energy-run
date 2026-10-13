// Birthday greeting billboards along the road (purely visual: no effect on the run).
import { textUp } from './entities.js';
import { roundRect, BRAND_Y } from './util.js';
import { hashString } from '/shared/rng.js';
import { cityStart, cityLength } from '/shared/config.js';

export const GREETINGS = [
  { lt: 'Mindaugai, su gimtadieniu! Energijos – kaip visam Baltijos tinklui.', en: 'Happy birthday, Mindaugas! Energy enough for the whole Baltic grid.' },
  { lt: 'Daugiau metų – daugiau kilovatų patirties. Su gimtadieniu!', en: 'More years, more kilowatts of experience. Happy birthday!' },
  { lt: 'Vienintelė leistina įtampa – elektros linijose. Linksmo gimtadienio!', en: 'The only tension allowed is in the power lines. Happy birthday!' },
  { lt: 'Tavo idėjos jungia Europą greičiau nei mūsų kabeliai. Sveikiname!', en: 'Your ideas connect Europe faster than our cables. Congratulations!' },
  { lt: 'Šalmas ant galvos, tortas rankose – saugos reikalavimai įvykdyti!', en: 'Helmet on, cake in hand – safety requirements met!' },
  { lt: 'Žvakučių kasmet daugiau – bet ir šviesos aplink Tave daugiau.', en: 'More candles every year – and more light around you too.' },
  { lt: 'Projektas „Dar vieni metai“ – pristatytas laiku ir be defektų!', en: 'Project “One More Year” – delivered on time, zero defects!' },
  { lt: 'Tu – mūsų stipriausia srovė. Ilgiausių metų, Mindaugai!', en: 'You are our strongest current. Many happy returns, Mindaugas!' },
  { lt: 'Bėk drąsiai pirmyn, Mindaugai – visa komanda bėga kartu!', en: 'Keep running ahead, Mindaugas – the whole team runs with you!' },
  { lt: 'Sveikinimai nuo Vilniaus iki Hamburgo: su gimtadieniu, Mindaugai!', en: 'Greetings from Vilnius to Hamburg: happy birthday, Mindaugas!' },
];

const SIGN = { lt: '– MT GROUP komanda', en: '– the MT GROUP team' };
// where along each leg between two cities a billboard stands (share of the leg)
const SPOTS = [0.4, 0.82];
const PANEL_W = 5.2;
const FONT = '800 38px "Barlow Condensed", sans-serif';
const MAX_W = 470; // text width in font px (1 m = 100 px)

const wrapped = new Map();
function lines(ctx, text) {
  if (wrapped.has(text)) return wrapped.get(text);
  ctx.save();
  ctx.font = FONT;
  const out = [];
  let line = '';
  for (const w of text.split(' ')) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > MAX_W) {
      out.push(line);
      line = w;
    } else line = next;
  }
  if (line) out.push(line);
  ctx.restore();
  wrapped.set(text, out);
  return out;
}

/**
 * Billboards visible between x0 and x1: [{ x, idx }]. Fixed per run seed, so the
 * same run always shows the same wishes, and the next run shows others.
 */
export function billboardsIn(seed, x0, x1, tunnels = []) {
  const out = [];
  const base = hashString(String(seed));
  for (let ci = 0, s = 0; s < x1; ci++) {
    s = cityStart(ci);
    const len = cityLength(ci);
    if (s + len < x0) continue;
    SPOTS.forEach((f, k) => {
      const x = Math.round(s + len * f);
      if (x + PANEL_W < x0 || x > x1) return;
      // never in front of a tunnel portal
      if (tunnels.some((p) => x + PANEL_W > p.x0 - 15 && x < p.x0 + p.len + 15)) return;
      out.push({ x, idx: (base + ci * SPOTS.length + k) % GREETINGS.length });
    });
  }
  return out;
}

/** One billboard. Meters, y up, origin at the left pole's foot. */
export function drawBillboard(ctx, idx, lang) {
  const g = GREETINGS[idx % GREETINGS.length];
  const text = g[lang] || g.lt;
  // poles
  ctx.fillStyle = '#7E868F';
  ctx.fillRect(0.7, 0, 0.14, 2.5);
  ctx.fillRect(PANEL_W - 0.84, 0, 0.14, 2.5);
  // panel: yellow frame, white face
  ctx.fillStyle = BRAND_Y;
  roundRect(ctx, 0, 2.3, PANEL_W, 1.95, 0.1);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 0.1, 2.4, PANEL_W - 0.2, 1.75, 0.07);
  ctx.fill();
  // party garland along the top
  const cols = ['#E2364B', '#2B8CD4', '#2BB673', '#FF9F1C'];
  for (let i = 0; i < 9; i++) {
    const x = 0.25 + i * 0.6;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.moveTo(x, 4.25);
    ctx.lineTo(x + 0.4, 4.25);
    ctx.lineTo(x + 0.2, 3.98);
    ctx.closePath();
    ctx.fill();
  }
  // the wish (up to three lines) and who it is from
  const ls = lines(ctx, text).slice(0, 3);
  // centred on the panel, above the signature
  const top = 3.36 + (ls.length - 1) * 0.2;
  ls.forEach((l, i) => textUp(ctx, l, PANEL_W / 2, top - i * 0.4, FONT, '#1F2A3A'));
  textUp(ctx, SIGN[lang] || SIGN.lt, PANEL_W - 0.3, 2.55, '600 20px "Barlow", sans-serif', '#5A6472', 'right');
  ctx.strokeStyle = '#1A1E29';
  ctx.lineWidth = 0.025;
  roundRect(ctx, 0, 2.3, PANEL_W, 1.95, 0.1);
  ctx.stroke();
}
