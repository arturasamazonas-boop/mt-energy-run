// Particles and floating texts in world space (meters, y up).
import { textUp } from './entities.js';

const CONFETTI = ['#FFD800', '#E2364B', '#3FA9F5', '#34B37A', '#FFFFFF', '#F5A623'];

export class FX {
  constructor() {
    this.p = [];
    this.texts = [];
    this.rings = [];
  }

  clear() {
    this.p.length = 0;
    this.texts.length = 0;
    this.rings.length = 0;
  }

  add(o) {
    if (this.p.length > 500) this.p.shift();
    this.p.push(o);
  }

  dust(x, y, n = 6, vx = -2) {
    for (let i = 0; i < n; i++) {
      this.add({ k: 'dust', x: x + Math.random() * 0.3 - 0.15, y: y + 0.05, vx: vx * (0.3 + Math.random()), vy: 0.5 + Math.random() * 1.2, life: 0.5 + Math.random() * 0.3, t: 0, r: 0.08 + Math.random() * 0.1, g: -1 });
    }
  }

  sparks(x, y, n = 10, col = '#FFE14A', speed = 5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.add({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.25, t: 0, col, g: 9 });
    }
  }

  confetti(x, y, n = 40, spread = 6) {
    for (let i = 0; i < n; i++) {
      this.add({
        k: 'conf', x: x + (Math.random() - 0.5) * 2, y, vx: (Math.random() - 0.3) * spread, vy: 4 + Math.random() * 7,
        life: 1.6 + Math.random() * 1.2, t: 0, col: CONFETTI[i % CONFETTI.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, g: 7, drag: 1.4,
      });
    }
  }

  debris(x, y, col = '#B57C45', n = 10) {
    for (let i = 0; i < n; i++) {
      this.add({ k: 'deb', x, y, vx: 2 + Math.random() * 6, vy: 2 + Math.random() * 6, life: 0.9, t: 0, col, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20, g: 22, s: 0.08 + Math.random() * 0.14 });
    }
  }

  ring(x, y, col = '#FFE14A', max = 0.9) {
    this.rings.push({ x, y, t: 0, life: 0.35, col, max });
  }

  text(x, y, str, col = '#FFFFFF', size = 34, life = 0.9) {
    this.texts.push({ x, y, str, col, size, t: 0, life });
    if (this.texts.length > 30) this.texts.shift();
  }

  update(dt, scrollV = 0) {
    for (const o of this.p) {
      o.t += dt;
      if (o.drag) {
        o.vx -= o.vx * o.drag * dt;
        o.vy = Math.max(o.vy - o.g * dt, -2.2);
      } else o.vy -= o.g * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (o.vr) o.rot += o.vr * dt;
      if (o.k === 'deb' && o.y < 0) {
        o.y = 0;
        o.vy *= -0.35;
        o.vx *= 0.6;
      }
    }
    this.p = this.p.filter((o) => o.t < o.life);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.life);
    for (const tx of this.texts) {
      tx.t += dt;
      tx.x += scrollV * dt * 0.85;
      tx.y += dt * 1.2;
    }
    this.texts = this.texts.filter((tx) => tx.t < tx.life);
  }

  draw(ctx) {
    for (const o of this.p) {
      const a = 1 - o.t / o.life;
      switch (o.k) {
        case 'dust':
          ctx.fillStyle = `rgba(200,195,185,${0.55 * a})`;
          ctx.beginPath();
          ctx.arc(o.x, o.y, o.r * (1 + o.t * 2), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'spark':
          ctx.strokeStyle = o.col;
          ctx.globalAlpha = a;
          ctx.lineWidth = 0.05;
          ctx.beginPath();
          ctx.moveTo(o.x, o.y);
          ctx.lineTo(o.x - o.vx * 0.04, o.y - o.vy * 0.04);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        case 'conf':
          ctx.save();
          ctx.translate(o.x, o.y);
          ctx.rotate(o.rot);
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillStyle = o.col;
          ctx.fillRect(-0.07, -0.04, 0.14 * Math.abs(Math.cos(o.rot * 1.3)) + 0.02, 0.08);
          ctx.restore();
          break;
        case 'deb':
          ctx.save();
          ctx.translate(o.x, o.y);
          ctx.rotate(o.rot);
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillStyle = o.col;
          ctx.fillRect(-o.s / 2, -o.s / 2, o.s, o.s);
          ctx.restore();
          break;
        default:
      }
    }
    ctx.globalAlpha = 1;
    for (const r of this.rings) {
      const k = r.t / r.life;
      ctx.strokeStyle = r.col;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 0.08 * (1 - k) + 0.01;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 0.2 + k * r.max, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const tx of this.texts) {
      const k = tx.t / tx.life;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const s = k < 0.12 ? 0.6 + (k / 0.12) * 0.5 : 1.1 - Math.min(0.1, (k - 0.12) * 0.5);
      ctx.save();
      ctx.translate(tx.x, tx.y);
      ctx.scale(s, s);
      textUp(ctx, tx.str, 0.02, -0.02, `800 ${tx.size}px "Barlow Condensed", sans-serif`, 'rgba(0,0,0,0.45)');
      textUp(ctx, tx.str, 0, 0, `800 ${tx.size}px "Barlow Condensed", sans-serif`, tx.col);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
