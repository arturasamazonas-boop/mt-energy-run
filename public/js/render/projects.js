// Energy facilities shown behind each city's project gate.
// Origin: centre-bottom (gate x, ground). Meters, y up. lit: 0..1 (online).
import { shade, roundRect, BRAND_Y, BRAND_K } from './util.js';
import { textUp, imageUp } from './entities.js';
import { IMAGES } from './buildings.js';

const OUT = '#1A1E29';

function stroke(ctx, w = 0.04) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = w;
  ctx.stroke();
}

function lamp(ctx, x, y, on, col = '#FFF2A8', r = 0.09) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = on ? col : '#5A5F66';
  ctx.fill();
  if (on) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    g.addColorStop(0, 'rgba(255,240,170,0.5)');
    g.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
  }
}

function tank(ctx, x, w, h, col, on) {
  ctx.fillStyle = col;
  roundRect(ctx, x, 0.3, w, h, w * 0.18);
  ctx.fill();
  stroke(ctx, 0.04);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + w * 0.15, 0.5, w * 0.12, h - 0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x + w * 0.7, 0.4, w * 0.22, h - 0.3);
  lamp(ctx, x + w / 2, 0.3 + h + 0.12, on, '#FF5A4A', 0.07);
}

function turbine(ctx, x, h, t, on, scale = 1) {
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#F2F4F6';
  ctx.beginPath();
  ctx.moveTo(-0.16, 0);
  ctx.lineTo(0.16, 0);
  ctx.lineTo(0.07, h);
  ctx.lineTo(-0.07, h);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 0.03);
  ctx.fillStyle = '#E8EBEE';
  roundRect(ctx, -0.15, h - 0.12, 0.55, 0.26, 0.08);
  ctx.fill();
  stroke(ctx, 0.03);
  const a0 = on ? t * 2.2 : 0.5;
  for (let i = 0; i < 3; i++) {
    const a = a0 + (i * Math.PI * 2) / 3;
    ctx.save();
    ctx.translate(-0.15, h);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -0.07);
    ctx.quadraticCurveTo(1.0, -0.12, h * 0.42, 0);
    ctx.quadraticCurveTo(1.0, 0.06, 0, 0.07);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    stroke(ctx, 0.025);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(-0.15, h, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = BRAND_Y;
  ctx.fill();
  stroke(ctx, 0.02);
  lamp(ctx, 0.25, h + 0.2, on, '#FF5A4A', 0.05);
  ctx.restore();
}

function pad(ctx, w) {
  ctx.fillStyle = '#B9BDC2';
  ctx.fillRect(-w / 2, 0, w, 0.3);
  ctx.fillStyle = '#9EA3A9';
  ctx.fillRect(-w / 2, 0.24, w, 0.06);
}

function container(ctx, x, w, h, col, on, t, idx) {
  ctx.fillStyle = col;
  ctx.fillRect(x, 0.3, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  for (let k = x + 0.15; k < x + w; k += 0.3) ctx.fillRect(k, 0.35, 0.08, h - 0.1);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.035;
  ctx.strokeRect(x, 0.3, w, h);
  for (let i = 0; i < 3; i++) lamp(ctx, x + 0.3 + i * 0.25, 0.3 + h - 0.25, on && Math.sin(t * 4 + i + idx) > -0.4, '#5CF29A', 0.05);
}

const DRAW = {
  hydrogen(ctx, on, t) {
    pad(ctx, 14);
    for (let i = 0; i < 3; i++) container(ctx, -6.5 + i * 2.6, 2.4, 1.9, '#F2F4F6', on, t, i);
    for (let i = 0; i < 3; i++) tank(ctx, 1.4 + i * 1.3, 1.0, 4.2, '#FFFFFF', on);
    textUp(ctx, 'H₂', 3.35, 2.6, '800 70px "Barlow Condensed", sans-serif', on ? '#1E6FB0' : '#7D8A96');
    ctx.fillStyle = '#9AA3AD';
    ctx.fillRect(-6.5, 2.35, 12.0, 0.14);
    turbine(ctx, 6.4, 5.6, t, on, 0.9);
  },
  lng(ctx, on, t) {
    pad(ctx, 15);
    for (const [x, w, h] of [[-6.6, 4.4, 3.4], [-1.6, 4.4, 3.4]]) {
      ctx.fillStyle = '#EEF0F2';
      ctx.fillRect(x, 0.3, w, h);
      ctx.beginPath();
      ctx.ellipse(x + w / 2, 0.3 + h, w / 2, 0.8, 0, 0, Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.rect(x, 0.3, w, h);
      stroke(ctx, 0.04);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      for (let k = 0.8; k < h; k += 0.7) ctx.fillRect(x, 0.3 + k, w, 0.05);
      textUp(ctx, 'LNG', x + w / 2, 2.0, '800 64px "Barlow Condensed", sans-serif', on ? '#1F5FA8' : '#8A96A3');
      lamp(ctx, x + w / 2, 0.3 + h + 0.95, on, '#FF5A4A', 0.08);
    }
    // flare stack
    ctx.fillStyle = '#8D949C';
    ctx.fillRect(4.0, 0.3, 0.3, 6.5);
    if (on) {
      const f = 0.6 + 0.2 * Math.sin(t * 18);
      ctx.fillStyle = '#FFB020';
      ctx.beginPath();
      ctx.moveTo(3.95, 6.8);
      ctx.quadraticCurveTo(4.15, 6.8 + f * 1.4, 4.35, 6.8);
      ctx.fill();
      ctx.fillStyle = '#FFE680';
      ctx.beginPath();
      ctx.moveTo(4.05, 6.8);
      ctx.quadraticCurveTo(4.15, 6.8 + f * 0.8, 4.25, 6.8);
      ctx.fill();
    }
    ctx.fillStyle = BRAND_Y;
    ctx.fillRect(-7, 1.0, 14, 0.18);
    ctx.fillRect(5.2, 0.3, 0.2, 1.0);
    ctx.fillRect(6.4, 0.3, 0.2, 1.0);
  },
  gas(ctx, on, t) {
    pad(ctx, 14);
    ctx.fillStyle = '#C9CED4';
    ctx.fillRect(-6, 0.3, 6.5, 3.4);
    ctx.fillStyle = '#AEB4BA';
    ctx.beginPath();
    ctx.moveTo(-6.3, 3.7);
    ctx.lineTo(-2.75, 4.6);
    ctx.lineTo(0.8, 3.7);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, 0.04);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = on ? '#FFE9A8' : '#56606B';
      ctx.fillRect(-5.5 + i * 1.5, 2.1, 0.9, 0.9);
    }
    ctx.fillStyle = '#3A4149';
    ctx.fillRect(-3.4, 0.3, 1.4, 1.6);
    for (const [y, col] of [[1.0, BRAND_Y], [1.6, '#9AA3AD']]) {
      ctx.fillStyle = col;
      ctx.fillRect(0.5, y, 6.5, 0.32);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 0.03;
      ctx.strokeRect(0.5, y, 6.5, 0.32);
    }
    // valve wheels
    for (const x of [2.2, 4.6]) {
      ctx.strokeStyle = on ? '#E2364B' : '#7A3A3A';
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      ctx.arc(x, 2.5, 0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#5A5F66';
      ctx.fillRect(x - 0.05, 1.3, 0.1, 1.2);
    }
    ctx.fillStyle = '#8D949C';
    ctx.fillRect(-1.2, 3.7, 0.5, 2.6);
    if (on) {
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.6 + i * 0.25) % 1;
        ctx.fillStyle = `rgba(240,244,248,${0.6 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(-0.95 + k * 0.8, 6.4 + k * 1.6, 0.3 + k * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  pipeline(ctx, on, t) {
    ctx.fillStyle = '#4C7FA6';
    ctx.fillRect(-7.5, 0, 15, 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let x = -7; x < 7.5; x += 1.3) ctx.fillRect(x + ((t * 0.6) % 1.3), 0.38, 0.6, 0.05);
    // platform
    ctx.fillStyle = '#7C858F';
    for (const x of [3.0, 6.0]) ctx.fillRect(x, 0, 0.3, 3.4);
    ctx.fillStyle = BRAND_Y;
    ctx.fillRect(2.5, 3.4, 4.3, 0.5);
    ctx.fillStyle = '#E9ECEF';
    ctx.fillRect(3.2, 3.9, 2.4, 1.6);
    stroke(ctx, 0.03);
    ctx.fillStyle = '#8D949C';
    ctx.fillRect(5.7, 3.9, 0.25, 2.8);
    lamp(ctx, 5.82, 6.85, on, '#FF5A4A', 0.08);
    // pipeline on supports
    for (let x = -7; x < 3; x += 1.6) {
      ctx.fillStyle = '#5E6670';
      ctx.fillRect(x, 0.3, 0.16, 1.1);
    }
    ctx.fillStyle = BRAND_Y;
    ctx.fillRect(-7.2, 1.35, 10.2, 0.45);
    stroke(ctx, 0.03);
    if (on) {
      for (let i = 0; i < 6; i++) {
        const x = -7 + ((t * 3 + i * 1.7) % 10);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(x, 1.52, 0.5, 0.08);
      }
    }
  },
  offshorewind(ctx, on, t) {
    ctx.fillStyle = '#3F6F95';
    ctx.fillRect(-7.5, 0, 15, 0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let x = -7; x < 7.5; x += 1.1) ctx.fillRect(x + ((t * 0.5) % 1.1), 0.45, 0.5, 0.05);
    turbine(ctx, -4.5, 6.2, t, on, 1);
    turbine(ctx, 0.5, 5.2, t + 0.7, on, 0.85);
    turbine(ctx, 5.0, 4.4, t + 1.3, on, 0.7);
    for (const x of [-4.6, 0.4, 4.9]) {
      ctx.fillStyle = BRAND_Y;
      ctx.fillRect(x - 0.3, 0.4, 0.6, 0.35);
    }
  },
  bess(ctx, on, t) {
    pad(ctx, 15);
    for (let i = 0; i < 4; i++) container(ctx, -7 + i * 2.9, 2.6, 2.2, '#F2F4F6', on, t, i);
    for (let i = 0; i < 4; i++) {
      // charge bars
      const lvl = on ? 0.4 + 0.6 * ((Math.sin(t * 1.5 + i) + 1) / 2) : 0.1;
      ctx.fillStyle = '#2B2E33';
      ctx.fillRect(-6.6 + i * 2.9, 0.7, 0.35, 1.2);
      ctx.fillStyle = on ? '#5CF29A' : '#4A4F55';
      ctx.fillRect(-6.57 + i * 2.9, 0.73, 0.29, 1.14 * lvl);
    }
    // transformer
    ctx.fillStyle = '#8D949C';
    ctx.fillRect(4.8, 0.3, 2.2, 2.0);
    stroke(ctx, 0.03);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#C08A4C';
      ctx.fillRect(5.1 + i * 0.6, 2.3, 0.18, 0.8);
    }
    textUp(ctx, '140 MWh', -1.2, 2.9, '800 40px "Barlow Condensed", sans-serif', on ? '#34B37A' : '#7D8A96');
  },
  ccs(ctx, on, t) {
    pad(ctx, 14);
    tank(ctx, -6.5, 1.3, 6.0, '#E5E8EB', on);
    tank(ctx, -4.8, 1.0, 4.6, '#E5E8EB', on);
    ctx.fillStyle = '#C9CED4';
    ctx.fillRect(-3.2, 0.3, 4.2, 2.6);
    stroke(ctx, 0.03);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = on ? '#FFE9A8' : '#56606B';
      ctx.fillRect(-2.8 + i * 1.3, 1.6, 0.8, 0.7);
    }
    for (let i = 0; i < 2; i++) tank(ctx, 1.8 + i * 1.6, 1.3, 3.0, '#7FB0D8', on);
    textUp(ctx, 'CO₂', 3.3, 2.0, '800 54px "Barlow Condensed", sans-serif', on ? '#FFFFFF' : '#C9D3DD');
    ctx.fillStyle = BRAND_Y;
    ctx.fillRect(-6.5, 3.2, 12, 0.18);
    if (on) {
      // clean vapour
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.5 + i * 0.25) % 1;
        ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(-5.85 + k * 0.6, 6.5 + k * 1.8, 0.35 + k * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  biogas(ctx, on, t) {
    pad(ctx, 14);
    for (const x of [-5, -0.8]) {
      ctx.fillStyle = '#B9BDC2';
      ctx.fillRect(x - 1.9, 0.3, 3.8, 1.6);
      ctx.fillStyle = on ? '#6FBF5A' : '#7E9277';
      ctx.beginPath();
      ctx.ellipse(x, 1.9, 1.9, 1.7, 0, 0, Math.PI);
      ctx.fill();
      stroke(ctx, 0.035);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.ellipse(x - 0.6, 2.8, 0.4, 0.25, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#8D949C';
    ctx.fillRect(3.4, 0.3, 0.25, 5);
    if (on) {
      ctx.fillStyle = '#5AB0FF';
      const f = 0.4 + 0.15 * Math.sin(t * 20);
      ctx.beginPath();
      ctx.moveTo(3.35, 5.3);
      ctx.quadraticCurveTo(3.52, 5.3 + f * 1.6, 3.7, 5.3);
      ctx.fill();
    }
    ctx.fillStyle = '#C9CED4';
    ctx.fillRect(4.4, 0.3, 2.6, 2.4);
    stroke(ctx, 0.03);
    ctx.fillStyle = on ? '#FFE9A8' : '#56606B';
    ctx.fillRect(4.8, 1.4, 1.8, 0.7);
  },
  substation(ctx, on, t) {
    pad(ctx, 15);
    // pylons
    for (const [x, h] of [[-5.5, 7], [5.5, 7]]) {
      ctx.strokeStyle = '#6A737D';
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      ctx.moveTo(x - 1, 0.3);
      ctx.lineTo(x - 0.25, h);
      ctx.lineTo(x + 0.25, h);
      ctx.lineTo(x + 1, 0.3);
      for (let y = 1; y < h; y += 0.9) {
        const k = 1 - (y - 0.3) / h;
        ctx.moveTo(x - 0.25 - 0.75 * k, y);
        ctx.lineTo(x + 0.25 + 0.75 * k * 0.9, y + 0.9);
      }
      ctx.moveTo(x - 1.6, h - 1);
      ctx.lineTo(x + 1.6, h - 1);
      ctx.moveTo(x - 1.2, h - 2.2);
      ctx.lineTo(x + 1.2, h - 2.2);
      ctx.stroke();
    }
    // conductors
    ctx.strokeStyle = on ? '#FFE680' : '#4A4F55';
    ctx.lineWidth = 0.04;
    for (const y of [6, 4.8]) {
      ctx.beginPath();
      ctx.moveTo(-7, y);
      ctx.quadraticCurveTo(0, y - 0.8, 7, y);
      ctx.stroke();
    }
    // transformers
    for (const x of [-2.6, 0.6]) {
      ctx.fillStyle = '#8D949C';
      ctx.fillRect(x, 0.3, 2.2, 2.2);
      stroke(ctx, 0.03);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let k = 0.2; k < 2.1; k += 0.3) ctx.fillRect(x + k, 0.4, 0.12, 1.9);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#C08A4C';
        ctx.fillRect(x + 0.3 + i * 0.65, 2.5, 0.18, 0.9);
        lamp(ctx, x + 0.39 + i * 0.65, 3.5, on, '#9FE3FF', 0.06);
      }
    }
    if (on) {
      const k = (t * 1.5) % 1;
      ctx.strokeStyle = `rgba(160,220,255,${1 - k})`;
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.arc(0, 2.5, 1 + k * 3, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  },
  solar(ctx, on, t) {
    pad(ctx, 15);
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 5; i++) {
        const x = -7 + i * 2.6 + r * 1.3;
        const y = 0.3 + r * 0.9;
        ctx.fillStyle = '#6A737D';
        ctx.fillRect(x + 0.9, 0.3, 0.1, y + 0.6);
        ctx.beginPath();
        ctx.moveTo(x, y + 0.5);
        ctx.lineTo(x + 2.2, y + 1.3);
        ctx.lineTo(x + 2.2, y + 1.55);
        ctx.lineTo(x, y + 0.75);
        ctx.closePath();
        ctx.fillStyle = on ? '#2F6BB0' : '#46566A';
        ctx.fill();
        stroke(ctx, 0.025);
        if (on) {
          const k = (t * 0.8 + i * 0.2 + r * 0.1) % 1;
          ctx.fillStyle = `rgba(255,255,255,${0.5 * Math.sin(k * Math.PI)})`;
          ctx.beginPath();
          ctx.moveTo(x + k * 2.0, y + 0.5 + k * 0.8);
          ctx.lineTo(x + k * 2.0 + 0.25, y + 0.6 + k * 0.8);
          ctx.lineTo(x + k * 2.0 + 0.25, y + 0.85 + k * 0.8);
          ctx.lineTo(x + k * 2.0, y + 0.75 + k * 0.8);
          ctx.fill();
        }
      }
    }
    ctx.fillStyle = '#C9CED4';
    ctx.fillRect(5.6, 0.3, 1.6, 1.8);
    stroke(ctx, 0.03);
    lamp(ctx, 6.4, 1.6, on, '#5CF29A', 0.08);
  },
};

export function drawFacility(ctx, type, on, t) {
  const fn = DRAW[type] || DRAW.substation;
  fn(ctx, on, t);
  // MT GROUP site sign
  ctx.fillStyle = '#5A5F66';
  ctx.fillRect(-7.1, 0, 0.1, 2.2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-7.9, 1.6, 1.8, 0.75);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.025;
  ctx.strokeRect(-7.9, 1.6, 1.8, 0.75);
  const img = IMAGES.logo;
  if (img) {
    const h = 0.55;
    imageUp(ctx, img, -7.8, 1.7, (img.width / img.height) * h, h);
  }
  void shade;
  void BRAND_K;
}
