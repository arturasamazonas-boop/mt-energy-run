// Behind-the-hero view of a cable tunnel (Temple-Run style stretch).
// A tiny pinhole projection: x = lateral (m), y = up (m), z = meters into the tunnel.
import { TUNNEL, TOBS, pendingCorner, inTurnWindow, heroHeight } from '/shared/tunnel.js';
import { speedAt } from '/shared/config.js';
import { OUTFITS } from './character.js';
import { drawBolt } from './entities.js';

const CAM_BACK = 4.4; // camera distance behind the hero
const CAM_H = 2.35;
const DRAW_DIST = 75;
const SEG = 2; // floor/wall segment length
const FOG = [10, 14, 20];
const HW = TUNNEL.width / 2;
const TH = TUNNEL.height;

function mix(c, f) {
  return `rgb(${Math.round(c[0] + (FOG[0] - c[0]) * f)},${Math.round(c[1] + (FOG[1] - c[1]) * f)},${Math.round(c[2] + (FOG[2] - c[2]) * f)})`;
}

export class TunnelView {
  constructor() {
    this.boltFrames = null;
    this.camX = 0;
    this.camY = CAM_H;
    this.pops = []; // times of bonus bolt pickups ("+5" floats up)
  }

  pop(t) {
    this.pops.push(t);
    if (this.pops.length > 8) this.pops.shift();
  }

  /** Pre-render the spinning bolt once (drawing gradients per bolt per frame is slow on phones). */
  bolts() {
    if (this.boltFrames) return this.boltFrames;
    const frames = [];
    for (let i = 0; i < 10; i++) {
      const c = document.createElement('canvas');
      c.width = c.height = 96;
      const g = c.getContext('2d');
      g.translate(48, 48);
      g.scale(72, -72);
      drawBolt(g, (i / 10) * ((Math.PI * 2) / 3.2));
      frames.push(c);
    }
    return (this.boltFrames = frames);
  }

  /** view: same object the side renderer gets. */
  draw(ctx, W, H, view) {
    const sim = view.sim;
    const tn = sim.tunnel;
    const t = view.t;
    const dt = view.dt || 0;
    const v = speedAt(sim.x);
    const heroX = tn.lx * TUNNEL.lane;
    // the camera follows the hero sideways, but lazily
    this.camX += (heroX * 0.7 - this.camX) * Math.min(1, dt * 8);
    // and rises with a jump so the hero stays in view below the HUD
    this.camY += (CAM_H + tn.y * 0.7 - this.camY) * Math.min(1, dt * 12);
    const camY = this.camY;
    const camZ = tn.z - CAM_BACK;
    const f = H * 0.9;
    const hy = H * 0.33;
    const cx = W / 2;
    const camX = this.camX;
    const P = (x, y, z) => {
      const dz = Math.max(0.35, z - camZ);
      return [cx + ((x - camX) * f) / dz, hy + ((camY - y) * f) / dz];
    };
    const poly = (pts, fill) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };
    const fogAt = (z) => Math.min(1, Math.max(0, (z - camZ - 8) / (DRAW_DIST - 8)));

    ctx.save();
    // swing the view after a corner
    const since = sim.time - tn.turnT;
    if (since < 0.4) {
      const k = 1 - since / 0.4;
      ctx.translate(tn.turnDir * W * 0.55 * k * k, 0);
    }

    ctx.fillStyle = mix([0, 0, 0], 1);
    ctx.fillRect(-W, 0, W * 3, H);

    const corner = pendingCorner(tn);
    const endZ = corner && corner.z + HW < camZ + DRAW_DIST ? corner.z + HW : camZ + DRAW_DIST;
    if (!corner || endZ === camZ + DRAW_DIST) {
      // light at the far end
      const [gx, gy] = P(0, TH * 0.4, camZ + DRAW_DIST);
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, H * 0.25);
      g.addColorStop(0, 'rgba(255,214,120,0.55)');
      g.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(gx - H * 0.3, gy - H * 0.3, H * 0.6, H * 0.6);
    }

    // ---- shell: floor, walls, ceiling (far to near) --------------------------------
    const z0 = Math.floor(camZ / SEG) * SEG;
    const segs = [];
    for (let z = z0; z < endZ; z += SEG) segs.push(z);
    // corner: the side passage beyond the opening
    if (corner && endZ < camZ + DRAW_DIST) {
      const d = corner.dir;
      const zA = corner.z - HW;
      const zB = corner.z + HW;
      const fo = fogAt(corner.z);
      const xo = d * HW;
      const xf = d * (HW + 14);
      poly([P(xo, 0, zA), P(xf, 0, zA), P(xf, 0, zB), P(xo, 0, zB)], mix([58, 62, 70], Math.min(1, fo + 0.15)));
      poly([P(xo, TH, zA), P(xf, TH, zA), P(xf, TH, zB), P(xo, TH, zB)], mix([30, 34, 40], Math.min(1, fo + 0.15)));
      // far wall of the side passage continues the end wall
      poly([P(xo, 0, zB), P(xf, 0, zB), P(xf, TH, zB), P(xo, TH, zB)], mix([78, 84, 94], Math.min(1, fo + 0.25)));
      // end wall
      poly([P(-HW, 0, zB), P(HW, 0, zB), P(HW, TH, zB), P(-HW, TH, zB)], mix([92, 98, 108], fo));
      // big turn arrow on the end wall
      const flash = 0.6 + 0.4 * Math.sin(t * 12);
      ctx.save();
      const [ax, ay] = P(0, TH * 0.48, zB - 0.01);
      const s = f / (zB - camZ);
      ctx.translate(ax, ay);
      ctx.scale(s * d, s);
      ctx.fillStyle = corner.ok ? '#2BD46A' : `rgba(255,216,0,${flash})`;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const o = -0.9 + i * 0.75;
        ctx.moveTo(o, -0.55);
        ctx.lineTo(o + 0.55, 0);
        ctx.lineTo(o, 0.55);
        ctx.lineTo(o + 0.28, 0.55);
        ctx.lineTo(o + 0.83, 0);
        ctx.lineTo(o + 0.28, -0.55);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    for (let i = segs.length - 1; i >= 0; i--) {
      const za = Math.max(segs[i], camZ + 0.4);
      const zb = Math.min(segs[i] + SEG, endZ);
      if (zb <= za) continue;
      const fo = fogAt(za);
      const odd = Math.floor(segs[i] / SEG) % 2 === 0;
      const openL = corner && corner.dir < 0 && zb > corner.z - HW;
      const openR = corner && corner.dir > 0 && zb > corner.z - HW;
      // floor
      poly([P(-HW, 0, za), P(HW, 0, za), P(HW, 0, zb), P(-HW, 0, zb)], mix(odd ? [70, 75, 84] : [64, 69, 78], fo));
      // ceiling
      poly([P(-HW, TH, za), P(HW, TH, za), P(HW, TH, zb), P(-HW, TH, zb)], mix([34, 38, 46], fo));
      // walls
      if (!openL) poly([P(-HW, 0, za), P(-HW, TH, za), P(-HW, TH, zb), P(-HW, 0, zb)], mix(odd ? [96, 102, 112] : [88, 94, 104], fo));
      if (!openR) poly([P(HW, 0, za), P(HW, TH, za), P(HW, TH, zb), P(HW, 0, zb)], mix(odd ? [96, 102, 112] : [88, 94, 104], fo));
      // cable trays along both walls
      for (const side of [-1, 1]) {
        if ((side < 0 && openL) || (side > 0 && openR)) continue;
        const x = side * (HW - 0.02);
        for (const [y, col] of [[2.75, [24, 24, 26]], [3.15, [230, 120, 20]], [2.35, [30, 30, 34]]]) {
          poly([P(x, y, za), P(x, y + 0.12, za), P(x, y + 0.12, zb), P(x, y, zb)], mix(col, fo));
        }
        // yellow/black base stripe
        poly([P(x, 0, za), P(x, 0.32, za), P(x, 0.32, zb), P(x, 0, zb)], mix(odd ? [255, 205, 0] : [30, 30, 30], fo));
      }
      // lane lines
      for (const lx of [-TUNNEL.lane / 2, TUNNEL.lane / 2]) {
        if (Math.floor(segs[i] / SEG) % 2) continue;
        poly([P(lx - 0.05, 0.01, za), P(lx + 0.05, 0.01, za), P(lx + 0.05, 0.01, zb), P(lx - 0.05, 0.01, zb)], mix([230, 196, 40], fo));
      }
      // ceiling lamps every 8 m
      if (Math.floor(segs[i]) % 8 === 0) {
        const zl = segs[i] + 0.6;
        if (zl > camZ + 0.5 && zl < endZ) poly([P(-0.5, TH - 0.02, zl), P(0.5, TH - 0.02, zl), P(0.5, TH - 0.02, zl + 0.5), P(-0.5, TH - 0.02, zl + 0.5)], mix([255, 244, 200], fo * 0.7));
      }
      // MT GROUP plates every 24 m
      if (Math.floor(segs[i]) % 24 === 0 && !openR) {
        const z = segs[i] + 0.4;
        if (z > camZ + 1) {
          poly([P(HW - 0.03, 1.2, z), P(HW - 0.03, 1.9, z), P(HW - 0.03, 1.9, z + 1.4), P(HW - 0.03, 1.2, z + 1.4)], mix([255, 216, 0], fo));
          const [px, py] = P(HW - 0.04, 1.55, z + 0.7);
          const fs = Math.round((f / (z + 0.7 - camZ)) * 0.36);
          if (fs > 5) {
            ctx.fillStyle = mix([20, 20, 20], fo);
            ctx.font = `800 ${fs}px Oswald, Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.save();
            ctx.translate(px, py);
            ctx.scale(0.55, 1);
            ctx.fillText('MT', 0, 0);
            ctx.restore();
          }
        }
      }
    }

    // ---- objects and hero, far to near ---------------------------------------------
    const items = [];
    for (const o of tn.def.obs) {
      if (!o.alive) continue;
      // things the hero has passed are dropped so they never fill the screen
      if (o.z + TOBS[o.kind].d < tn.z - 0.8 || o.z > endZ) continue;
      items.push({ z: o.z + (o.kind === 'gap' ? 99 : 0), o });
    }
    for (const b of tn.def.bolts) {
      if (!b.alive || b.z < tn.z - 1.5 || b.z > endZ) continue; // missed ones vanish before they fill the screen
      items.push({ z: b.z, b });
    }
    items.push({ z: tn.z + 0.01, hero: true });
    // gaps lie on the floor: draw them first
    items.sort((a, b) => b.z - a.z);
    const frames = this.bolts();
    for (const it of items) {
      if (it.hero) this.drawHero(ctx, P, f, tn, view, heroX, camZ);
      else if (it.b) {
        const b = it.b;
        const fo = fogAt(b.z);
        const [bx, by] = P(b.lane * TUNNEL.lane, b.y, b.z);
        const s = (f / (b.z - camZ)) * 1.3;
        ctx.globalAlpha = 1 - fo * 0.8;
        ctx.drawImage(frames[Math.floor((t * 3.2 / (Math.PI * 2)) * 10 + b.z) % 10], bx - s / 2, by - s / 2, s, s);
        ctx.globalAlpha = 1;
      } else this.drawObstacle(ctx, P, it.o, fogAt(it.o.z), t);
    }

    // ---- bonus: "+5" over the hero for each bolt, and a badge --------------------------
    const [px, py] = P(heroX, tn.y + 2.1, tn.z);
    const fs = Math.round(H * 0.045);
    ctx.font = `800 ${fs}px Oswald, Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.pops = this.pops.filter((p0) => t - p0 < 0.6);
    for (const p0 of this.pops) {
      const k = (t - p0) / 0.6;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#FFE14A';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(`+${TUNNEL.bonus}⚡`, px, py - k * H * 0.08);
      ctx.fillText(`+${TUNNEL.bonus}⚡`, px, py - k * H * 0.08);
    }
    ctx.globalAlpha = 1;
    {
      const label = `BONUS ⚡×${TUNNEL.bonus}`;
      const bw = ctx.measureText(label).width + fs * 1.2;
      const bx = W * 0.5 - bw / 2;
      const by = H * 0.87; // on the floor, away from the hero and the HUD
      ctx.fillStyle = 'rgba(255,216,0,0.92)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, fs * 1.3, fs * 0.65);
      else ctx.rect(bx, by, bw, fs * 1.3);
      ctx.fill();
      ctx.fillStyle = '#1E1E1E';
      ctx.fillText(label, W * 0.5, by + fs * 0.68);
    }

    // ---- turn prompt -----------------------------------------------------------------
    if (corner && inTurnWindow(tn, v) && !sim.dead) {
      const d = corner.dir;
      const a = corner.ok ? 1 : 0.55 + 0.45 * Math.sin(t * 16);
      ctx.save();
      ctx.translate(cx + d * W * 0.22, H * 0.42);
      ctx.scale(d * H * 0.09, H * 0.09);
      ctx.globalAlpha = a;
      ctx.fillStyle = corner.ok ? '#2BD46A' : '#FFD800';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      ctx.moveTo(-1, -0.35);
      ctx.lineTo(0.1, -0.35);
      ctx.lineTo(0.1, -0.8);
      ctx.lineTo(1, 0);
      ctx.lineTo(0.1, 0.8);
      ctx.lineTo(0.1, 0.35);
      ctx.lineTo(-1, 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  drawObstacle(ctx, P, o, fo, t) {
    const L = TUNNEL.lane;
    const box = (x0, x1, y0, y1, z0, z1, front, side, top) => {
      const camRight = this.camX > x1;
      const camLeft = this.camX < x0;
      const q = (pts, c) => {
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.fillStyle = c;
        ctx.fill();
      };
      if (y1 < this.camY && top) q([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], mix(top, fo));
      if (y0 > this.camY && top) q([P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)], mix(side, fo));
      if (camLeft) q([P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)], mix(side, fo));
      if (camRight) q([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], mix(side, fo));
      q([P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)], mix(front, fo));
    };
    const d = TOBS[o.kind].d;
    if (o.kind === 'gap') {
      const za = o.z;
      const zb = o.z + d;
      const q = (pts, c) => {
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.fillStyle = c;
        ctx.fill();
      };
      q([P(-HW, 0.005, za), P(HW, 0.005, za), P(HW, 0.005, zb), P(-HW, 0.005, zb)], mix([6, 8, 12], fo * 0.5));
      // far inner wall of the trench catches a little light
      q([P(-HW, 0.005, zb), P(HW, 0.005, zb), P(HW, -1.2, zb), P(-HW, -1.2, zb)], mix([40, 44, 52], fo));
      // warning edges
      for (const z of [za - 0.25, zb]) q([P(-HW, 0.01, z), P(HW, 0.01, z), P(HW, 0.01, z + 0.25), P(-HW, 0.01, z + 0.25)], mix([255, 140, 0], fo));
      return;
    }
    for (const lane of o.lanes) {
      const x0 = lane * L - 0.78;
      const x1 = lane * L + 0.78;
      if (o.kind === 'barrier') {
        // legs + striped plank
        box(x0 + 0.08, x0 + 0.2, 0, 0.55, o.z + 0.15, o.z + 0.3, [200, 200, 200], [150, 150, 150], [230, 230, 230]);
        box(x1 - 0.2, x1 - 0.08, 0, 0.55, o.z + 0.15, o.z + 0.3, [200, 200, 200], [150, 150, 150], [230, 230, 230]);
        box(x0, x1, 0.5, TOBS.barrier.h, o.z, o.z + d, [255, 216, 0], [190, 150, 0], [255, 236, 120]);
        // black chevrons on the plank
        for (let i = 0; i < 4; i++) {
          const a = x0 + 0.1 + i * 0.4;
          ctx.beginPath();
          const p1 = P(a, 0.52, o.z);
          const p2 = P(a + 0.18, 0.52, o.z);
          const p3 = P(a + 0.36, TOBS.barrier.h - 0.02, o.z);
          const p4 = P(a + 0.18, TOBS.barrier.h - 0.02, o.z);
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.lineTo(p3[0], p3[1]);
          ctx.lineTo(p4[0], p4[1]);
          ctx.closePath();
          ctx.fillStyle = mix([25, 25, 25], fo);
          ctx.fill();
        }
      } else if (o.kind === 'wall') {
        // switchgear cabinet: full height, blocks the lane
        box(x0, x1, 0, TOBS.wall.h, o.z, o.z + d, [70, 92, 120], [50, 66, 88], [90, 110, 140]);
        const door = (xa, xb) => {
          ctx.beginPath();
          const pts = [P(xa, 0.25, o.z - 0.01), P(xb, 0.25, o.z - 0.01), P(xb, 2.9, o.z - 0.01), P(xa, 2.9, o.z - 0.01)];
          pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.closePath();
          ctx.fillStyle = mix([84, 108, 138], fo);
          ctx.fill();
        };
        door(x0 + 0.1, lane * L - 0.03);
        door(lane * L + 0.03, x1 - 0.1);
        // high-voltage sign
        const [sx, sy] = P(lane * L, 2.1, o.z - 0.02);
        const s = (P(lane * L + 0.3, 2.1, o.z - 0.02)[0] - sx) * 1.0;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.fillStyle = mix([255, 216, 0], fo);
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.95, s * 0.7);
        ctx.lineTo(-s * 0.95, s * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = mix([20, 20, 20], fo);
        ctx.beginPath();
        ctx.moveTo(s * 0.08, -s * 0.55);
        ctx.lineTo(-s * 0.2, s * 0.15);
        ctx.lineTo(0, s * 0.15);
        ctx.lineTo(-s * 0.08, s * 0.55);
        ctx.lineTo(s * 0.2, -s * 0.05);
        ctx.lineTo(0, -s * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // blinking red lamp on top
        if (Math.sin(t * 6 + lane) > 0) {
          const [lx, ly] = P(lane * L, TOBS.wall.h + 0.1, o.z + 0.3);
          ctx.fillStyle = 'rgba(255,60,40,0.9)';
          ctx.beginPath();
          ctx.arc(lx, ly, Math.max(2, s * 0.25), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (o.kind === 'beam') {
        // a pipe with hazard stripes hanging at chest height: slide under it
        const y0 = TOBS.beam.y0;
        box(x0, x1, y0, y0 + 0.45, o.z, o.z + d, [220, 40, 30], [150, 20, 15], [240, 90, 80]);
        for (let i = 0; i < 4; i++) {
          const a = x0 + 0.05 + i * 0.4;
          ctx.beginPath();
          const pts = [P(a, y0, o.z - 0.01), P(a + 0.18, y0, o.z - 0.01), P(a + 0.18, y0 + 0.45, o.z - 0.01), P(a, y0 + 0.45, o.z - 0.01)];
          pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.closePath();
          ctx.fillStyle = mix([245, 245, 245], fo);
          ctx.fill();
        }
        // hangers up to the ceiling
        for (const hx of [x0 + 0.15, x1 - 0.15]) box(hx - 0.03, hx + 0.03, y0 + 0.45, TH, o.z + 0.2, o.z + 0.26, [60, 60, 60], [40, 40, 40], null);
      }
    }
  }

  drawHero(ctx, P, f, tn, view, heroX, camZ) {
    const sim = view.sim;
    const o = OUTFITS[view.outfit] || OUTFITS.suit;
    const dz = tn.z - camZ;
    const s = f / dz;
    // shadow
    const [shx, shy] = P(heroX, 0, tn.z);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(shx, shy, s * 0.42 * Math.max(0.5, 1 - tn.y * 0.2), s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    const [hx, hy] = P(heroX, tn.y, tn.z);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(s, -s);
    // lean into lane changes
    ctx.rotate((tn.lane - tn.lx) * -0.25);
    const sliding = tn.slideT > 0;
    const air = !tn.onGround;
    if (sliding) ctx.scale(1.05, 0.5);
    const p = sim.x * 1.25;
    const run = !air && !sliding && !sim.dead;
    const limb = (x0, y0, x1, y1, w, col) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    };
    // legs (the lifted one comes towards the camera and looks shorter)
    for (const side of [-1, 1]) {
      const lift = run ? Math.max(0, Math.sin(p + (side > 0 ? Math.PI : 0))) : air ? 0.6 : 0;
      const fy = 0.05 + lift * 0.42;
      limb(side * 0.11, 0.86, side * 0.13, fy + 0.06, 0.19, o.pantsD || o.pants);
      ctx.fillStyle = o.shoes;
      ctx.beginPath();
      ctx.ellipse(side * 0.13, fy, 0.1, 0.07 + lift * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      if (lift > 0.3) {
        ctx.fillStyle = '#C9C2B8'; // sole
        ctx.beginPath();
        ctx.ellipse(side * 0.13, fy - 0.03, 0.08, 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // arms swing opposite to the legs
    for (const side of [-1, 1]) {
      const sw = run ? Math.sin(p + (side > 0 ? 0 : Math.PI)) : 0;
      const hand = air ? [side * 0.5, 1.75] : [side * (0.36 + Math.abs(sw) * 0.04), 0.98 + sw * 0.14];
      limb(side * 0.27, 1.32, hand[0], hand[1], 0.14, o.jacketD || o.jacket);
      ctx.fillStyle = '#F1C9A5';
      ctx.beginPath();
      ctx.arc(hand[0], hand[1], 0.065, 0, Math.PI * 2);
      ctx.fill();
    }
    // torso (back of the jacket)
    ctx.fillStyle = o.jacket;
    ctx.beginPath();
    ctx.moveTo(-0.27, 0.8);
    ctx.lineTo(0.27, 0.8);
    ctx.lineTo(0.31, 1.36);
    ctx.quadraticCurveTo(0, 1.44, -0.31, 1.36);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = o.jacketD || o.jacket;
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(0, 0.82);
    ctx.lineTo(0, 1.3);
    ctx.stroke();
    if (o.overalls || o.vest) {
      ctx.fillStyle = '#C8CDD3';
      ctx.fillRect(-0.27, 1.02, 0.54, 0.05);
    }
    // collar + neck
    ctx.fillStyle = o.shirt;
    ctx.fillRect(-0.08, 1.38, 0.16, 0.05);
    ctx.fillStyle = '#E8B994';
    ctx.fillRect(-0.06, 1.41, 0.12, 0.06);
    // head from behind: hair, then the helmet
    ctx.fillStyle = '#5A4636';
    ctx.beginPath();
    ctx.arc(0, 1.57, 0.15, 0, Math.PI * 2);
    ctx.fill();
    if (o.hat === 'helmet' || o.hat === 'goldhelmet') {
      ctx.fillStyle = o.hat === 'goldhelmet' ? '#E5B93E' : '#FFD200';
      ctx.beginPath();
      ctx.ellipse(0, 1.6, 0.19, 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 1.62, 0.16, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-0.015, 1.63, 0.03, 0.14);
    } else if (o.hat === 'party') {
      ctx.fillStyle = '#E2364B';
      ctx.beginPath();
      ctx.moveTo(-0.11, 1.68);
      ctx.lineTo(0.11, 1.68);
      ctx.lineTo(0, 1.98);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    if (sim.shieldT > 0) {
      const [bx, by] = P(heroX, tn.y + heroHeight(tn) / 2, tn.z);
      ctx.strokeStyle = 'rgba(120,210,255,0.8)';
      ctx.fillStyle = 'rgba(120,210,255,0.15)';
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath();
      ctx.ellipse(bx, by, s * 0.65, s * 1.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
