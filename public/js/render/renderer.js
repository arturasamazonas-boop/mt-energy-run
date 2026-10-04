// Frame renderer: camera, parallax scenery, entities, hero and screen effects.
import { CITIES, cityAt, cityStart, PHYSICS } from '/shared/config.js';
import { THEMES } from './palette.js';
import { Scenery, GROUND_FRAC } from './scenery.js';
import { drawObstacle, drawBolt, drawToken, drawPower, drawTask, drawPart, drawCitySign, drawGateSign } from './entities.js';
import { drawFacility } from './projects.js';
import { drawCharacter, runPose, jumpPose, slidePose, hangPose, idlePose, cheerPose, drawDrone, drawExcavator, drawShield } from './character.js';
import { FX } from './fx.js';
import { SpriteCache, clamp, lerp } from './util.js';

const OBSTACLES = new Set(['cone', 'barrier', 'drum', 'rollDrum', 'cable', 'crate', 'stack', 'container', 'scaffold', 'beam', 'rack', 'birds']);

// How far the scenery is muted during a run (see calmBackdrop). A plain
// translucent haze: blend modes such as 'saturation' are very slow on phones.
const CALM = {
  dayHaze: [178, 186, 198, 44], // r, g, b, alpha %
  nightHaze: [70, 80, 104, 38],
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.scenery = new Scenery();
    this.fx = new FX();
    this.sprites = new SpriteCache(80);
    this.ppm = 50;
    this.dpr = 1;
    this.W = 0;
    this.H = 0;
    this.shake = 0;
    this.flash = 0;
    this.flashCol = '255,255,255';
    this.lang = 'lt';
    this.quality = 1;
    this.calm = true; // muted scenery during a run (calmBackdrop)
    this.camX = 0;
    this.camY = 0;
    this.resize();
  }

  resize() {
    const cssW = this.canvas.clientWidth || window.innerWidth;
    const cssH = this.canvas.clientHeight || window.innerHeight;
    const maxDpr = this.quality >= 1 ? 2 : this.quality > 0.5 ? 1.25 : 1;
    this.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const W = Math.round(cssW * this.dpr);
    const H = Math.round(cssH * this.dpr);
    if (W === this.W && H === this.H) return;
    this.canvas.width = W;
    this.canvas.height = H;
    this.W = W;
    this.H = H;
    this.scenery.resize(W, H);
    this.scenery.quality = this.quality;
    this.sprites.clear();
    this.vignette = null;
  }

  targetPpm(speed) {
    const viewM = clamp(speed * 1.15 + 6.5, 17.5, 34);
    return Math.min(this.W / viewM, this.H / 9.4);
  }

  /** Convert world meters to screen pixels. */
  sx(x) {
    return (x - this.camX) * this.ppm;
  }
  sy(y) {
    return this.groundY - (y - this.camY) * this.ppm;
  }

  /**
   * view: { sim, t, dt, hero: {...visual state}, outfit, attract, birthday }
   */
  render(view) {
    const { ctx, W, H } = this;
    const sim = view.sim;
    const t = view.t;
    const dt = view.dt || 0;
    this.scenery.lang = this.lang;
    this.scenery.birthday = !!view.birthday;

    // ---- camera -------------------------------------------------------------
    const target = this.targetPpm(sim.speed);
    this.ppm = this.ppm ? lerp(this.ppm, target, Math.min(1, dt * 1.5)) : target;
    if (view.snapCamera) this.ppm = target;
    const ppm = this.ppm;
    this.groundY = Math.round(H * GROUND_FRAC);
    const viewM = W / ppm;
    const heroX = view.heroX ?? sim.x;
    this.heroFrac = lerp(this.heroFrac ?? 0.24, view.heroFrac ?? 0.24, Math.min(1, dt * 3));
    this.camX = heroX - viewM * this.heroFrac;
    // follow upward a little when very high (drone, containers)
    const wantCamY = Math.max(0, (sim.y - 3.2) * 0.55);
    this.camY = lerp(this.camY, wantCamY, Math.min(1, dt * 4));

    const sky = this.scenery.skyAt(sim.x + viewM * 0.3);
    const ci = cityAt(Math.max(0, sim.x)).index;
    const city = CITIES[ci % CITIES.length];
    const theme = THEMES[city.theme] || THEMES.baltic;

    ctx.save();
    if (this.shake > 0.01) {
      const s = this.shake * H * 0.012;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      this.shake = Math.max(0, this.shake - dt * 3);
    }

    // ---- background -----------------------------------------------------------
    // each layer: daylight art → time-of-day tint → its own lights (so lights of a
    // distant layer never shine through a nearer one)
    const lights = sky.night > 0.05 ? Math.min(1, sky.night * 1.15) : 0;
    const emit = (fn) => {
      if (!lights) return;
      ctx.globalAlpha = lights;
      fn();
      ctx.globalAlpha = 1;
    };
    this.scenery.drawSky(ctx, sky, t, this.camX);
    this.scenery.drawFar(ctx, this.camX, sky);
    this.scenery.tint(ctx, sky, this.groundY, 0.6);
    emit(() => this.scenery.drawFar(ctx, this.camX, sky, true));
    this.scenery.drawMid(ctx, this.camX);
    this.scenery.tint(ctx, sky, this.groundY, 0.6);
    emit(() => this.scenery.drawMid(ctx, this.camX, true));
    this.scenery.drawNear(ctx, this.camX);
    this.drawWorldBackdrop(ctx, sim, t, view.lang || this.lang);
    this.scenery.tint(ctx, sky, this.groundY, 0.6);
    emit(() => this.scenery.drawNear(ctx, this.camX, true, sky.night));
    // during a run the scenery steps back so obstacles and pickups read at a glance
    if (!view.attract && this.calm) this.calmBackdrop(ctx, sky);

    // ---- ground -------------------------------------------------------------
    const pits = [];
    for (const e of sim.entities) if (e.k === 'pit' && e.alive) pits.push(e);
    this.scenery.drawGround(ctx, this.camX, ppm, this.sy(0), theme, pits, t, !view.attract && this.calm);

    if (view.markers) this.drawMarkers(ctx, view.markers, viewM);

    // ---- gameplay entities -----------------------------------------------------
    const x0 = this.camX - 4;
    const x1 = this.camX + viewM + 4;
    for (const e of sim.entities) {
      if (!e.alive) continue;
      const ex = e.x;
      if (ex + (e.w || 1) < x0 || ex > x1 + 8) continue;
      if (OBSTACLES.has(e.k)) {
        this.worldAt(ctx, ex, 0);
        drawObstacle(ctx, e, t, { lang: this.lang, theme: city.theme, viewTop: this.groundY / ppm + this.camY });
        ctx.restore();
      } else if (e.k === 'pit') {
        this.worldAt(ctx, ex, 0);
        for (const px of [-0.35, e.w + 0.22]) {
          ctx.fillStyle = '#ECECEC';
          ctx.fillRect(px, 0, 0.12, 0.62);
          ctx.fillStyle = '#E2362B';
          ctx.fillRect(px, 0.15, 0.12, 0.12);
          ctx.fillRect(px, 0.4, 0.12, 0.12);
        }
        ctx.restore();
      }
    }

    // ---- hero -----------------------------------------------------------------
    if (!view.hideHero) this.drawHero(ctx, sim, view, t);

    // gameplay tint (lighter than background so the action stays readable)
    this.scenery.tint(ctx, sky, H, 0.35);

    // ---- pickups (glow over tint) ---------------------------------------------
    for (const e of sim.entities) {
      if (!e.alive) continue;
      if (e.x < x0 || e.x > x1) continue;
      switch (e.k) {
        case 'bolt':
          this.drawBoltSprite(ctx, e, t);
          break;
        case 'part':
          this.worldAt(ctx, e.x, e.y);
          drawPart(ctx, city.project.type, t, e.part);
          ctx.restore();
          break;
        case 'token':
          this.worldAt(ctx, e.x, e.y);
          drawToken(ctx, t);
          ctx.restore();
          break;
        case 'power':
          this.worldAt(ctx, e.x, e.y);
          drawPower(ctx, e.kind, t);
          ctx.restore();
          break;
        case 'task':
          this.worldAt(ctx, e.x, e.y);
          drawTask(ctx, t);
          ctx.restore();
          break;
        default:
      }
    }

    // ---- fx -----------------------------------------------------------------
    this.fx.update(dt, sim.dead ? 0 : sim.speed);
    this.worldAt(ctx, 0, 0);
    this.fx.draw(ctx);
    ctx.restore();

    ctx.restore(); // shake

    // ---- screen effects ---------------------------------------------------------
    if (!view.attract) this.drawSpeedLines(ctx, sim, t);
    this.drawVignette(ctx, view.attract ? 0.55 : 0.35);
    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(${this.flashCol},${this.flash})`;
      ctx.fillRect(0, 0, W, H);
      this.flash = Math.max(0, this.flash - dt * 2.5);
    }
  }

  /** Mute everything above the walkway: a grey haze lowers colour and contrast (lighter by day, blue-grey at night). */
  calmBackdrop(ctx, sky) {
    const h = this.groundY;
    const n = Math.min(1, sky.night || 0);
    const day = CALM.dayHaze;
    const night = CALM.nightHaze;
    const c = day.map((v, i) => Math.round(v + (night[i] - v) * n));
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 100})`;
    ctx.fillRect(0, 0, this.W, h);
  }

  /** Distance flags (own record, next colleague). Drawn in screen pixels so the label stays crisp. */
  drawMarkers(ctx, markers, viewM) {
    const ppm = this.ppm;
    for (const m of markers) {
      if (m.x < this.camX - 2 || m.x > this.camX + viewM + 6) continue;
      const x = Math.round(this.sx(m.x));
      const base = this.sy(0);
      const top = this.sy(3.4);
      ctx.save();
      ctx.globalAlpha = m.passed ? 0.45 : 1;
      ctx.fillStyle = '#1E1E1E';
      ctx.fillRect(x - Math.max(1, ppm * 0.04), top, Math.max(2, ppm * 0.08), base - top);
      const fs = Math.max(11, Math.round(ppm * 0.36));
      ctx.font = `800 ${fs}px "Barlow Condensed", sans-serif`;
      const label = m.label;
      const tw = ctx.measureText(label).width;
      const pad = fs * 0.45;
      const fh = fs * 1.5;
      ctx.fillStyle = m.color || '#FFD800';
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + tw + pad * 2 + fs * 0.5, top);
      ctx.lineTo(x + tw + pad * 2, top + fh / 2);
      ctx.lineTo(x + tw + pad * 2 + fs * 0.5, top + fh);
      ctx.lineTo(x, top + fh);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = Math.max(1, ppm * 0.03);
      ctx.stroke();
      ctx.fillStyle = m.textColor || '#1E1E1E';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + pad, top + fh / 2 + 1);
      // finish-line strip across the road
      ctx.fillStyle = m.color || '#FFD800';
      ctx.globalAlpha *= 0.55;
      const sw = Math.max(3, ppm * 0.12);
      for (let i = 0; i < 6; i++) if (i % 2 === 0) ctx.fillRect(x - sw / 2, base + i * sw * 0.5, sw, sw * 0.5);
      ctx.restore();
    }
  }

  /** ctx.save + transform into world meters (y up) at (x, y). Caller restores. */
  worldAt(ctx, x, y) {
    ctx.save();
    ctx.translate(this.sx(x), this.sy(y));
    ctx.scale(this.ppm, -this.ppm);
  }

  drawWorldBackdrop(ctx, sim, t, lang) {
    // city entry sign + project facility (behind the walkway, scrolls 1:1)
    const viewM = this.W / this.ppm;
    const ci = cityAt(Math.max(0, sim.x)).index;
    for (let i = Math.max(0, ci - 1); i <= ci + 1; i++) {
      const city = CITIES[i % CITIES.length];
      const sx = cityStart(i) + 8;
      if (sx > this.camX - 4 && sx < this.camX + viewM + 4) {
        this.worldAt(ctx, sx, 0.15);
        ctx.scale(0.9, 0.9);
        drawCitySign(ctx, city, lang);
        ctx.restore();
      }
    }
    for (const e of sim.entities) {
      if (e.k !== 'checkpoint') continue;
      if (e.x < this.camX - 6 || e.x > this.camX + viewM + 6) continue;
      const c = CITIES[cityAt(e.x).index % CITIES.length];
      const wp = (c.waypoints || []).find((w) => w.id === e.wp);
      if (!wp) continue;
      this.worldAt(ctx, e.x, 0.15);
      ctx.scale(0.9, 0.9);
      drawCitySign(ctx, { name: wp.name, flag: '🇱🇹', country: { lt: 'Kontrolinis punktas', en: 'Checkpoint' } }, lang);
      ctx.restore();
    }
    for (const e of sim.entities) {
      if (e.k !== 'gate') continue;
      if (e.x < this.camX - 22 || e.x > this.camX + viewM + 12) continue;
      const gi = cityAt(e.x - 1).index;
      const city = CITIES[gi % CITIES.length];
      const lit = e.passed ? 1 : 0;
      this.worldAt(ctx, e.x + 10, 0.2);
      ctx.scale(0.82, 0.82);
      drawFacility(ctx, city.project.type, lit > 0, t);
      ctx.restore();
      this.worldAt(ctx, e.x, 0);
      drawGateSign(ctx, city, lang, lit, t, e.stars || 0);
      ctx.restore();
    }
  }

  drawBoltSprite(ctx, e, t) {
    const frames = 12;
    const ph = ((t * 3.2) / (Math.PI * 2) + e.x * 0.05) % 1;
    const f = Math.floor(ph * frames);
    const size = Math.round(this.ppm * 1.3);
    const spr = this.sprites.get(`bolt:${f}:${size}`, size, size, (c) => {
      c.translate(size / 2, size / 2);
      c.scale(this.ppm, -this.ppm);
      drawBolt(c, (f / frames) * Math.PI * 2 / 3.2);
    }, 0);
    const bob = Math.sin(t * 4 + e.x) * 0.05;
    ctx.drawImage(spr.canvas, Math.round(this.sx(e.x) - size / 2), Math.round(this.sy(e.y + bob) - size / 2));
  }

  drawHero(ctx, sim, view, t) {
    const h = view.hero || {};
    const outfit = view.outfit || 'suit';
    const x = view.heroX ?? sim.x;
    let y = sim.y;
    let pose;
    let rot = 0;
    let expression = h.expression || 'smile';
    const blink = h.blink;
    if (h.deathT !== undefined && sim.dead) {
      const k = Math.min(1, h.deathT / 0.6);
      if (sim.deathCause === 'fall') {
        pose = jumpPose(-5, t);
      } else {
        pose = jumpPose(-5, t);
        rot = -k * 1.4;
        y = Math.max(0, h.deathY + 1.2 * Math.sin(Math.min(1, h.deathT / 0.5) * Math.PI) * (1 - k * 0.5)) - k * 0.2;
      }
      expression = 'ouch';
    } else if (view.attract && view.idle) {
      pose = idlePose(t, h.wave || 0);
    } else if (h.cheer > 0) {
      pose = cheerPose(t);
    } else if (sim.flying) {
      pose = hangPose(t);
    } else if (sim.sliding) {
      pose = slidePose(t);
    } else if (!sim.onGround) {
      pose = jumpPose(sim.vy, t);
      if (sim.jumps === 2 && h.spinT !== undefined && h.spinT < 0.42) rot = (h.spinT / 0.42) * Math.PI * 2;
    } else {
      pose = runPose(h.phase || 0, clamp((sim.speed - 10) / 14, 0, 1));
    }
    pose.rot = rot;

    const sx = this.sx(x);
    const sy = this.sy(y);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(this.ppm, -this.ppm);
    // ground shadow
    if (!sim.flying) {
      const gy = (this.sy(Math.max(0, h.shadowY ?? 0)) - sy) / -this.ppm;
      const k = clamp(1 - (y - (h.shadowY ?? 0)) / 4, 0.3, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.22 * k})`;
      ctx.beginPath();
      ctx.ellipse(0.05, gy + 0.02, 0.42 * k, 0.07 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // squash & stretch
    const sq = h.squash || 0;
    ctx.scale(1 + sq * 0.12, 1 - sq * 0.12);
    if (sim.invuln > 0 && !sim.dead && Math.sin(t * 30) > 0.2) ctx.globalAlpha = 0.45;
    if (sim.power.excavator > 0 && !sim.dead) {
      drawExcavator(ctx, t, outfit, blink);
    } else {
      if (sim.flying) drawDrone(ctx, t, 2.2);
      drawCharacter(ctx, pose, { outfit, t, blink, expression, shield: sim.helmet });
    }
    ctx.globalAlpha = 1;
    if (sim.helmet && !sim.dead) drawShield(ctx, t);
    if (sim.power.magnet > 0 && !sim.dead) {
      for (let i = 0; i < 3; i++) {
        const k = (t * 1.2 + i / 3) % 1;
        ctx.strokeStyle = `rgba(226,54,75,${0.45 * (1 - k)})`;
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.arc(0.05, 0.9, 0.5 + k * 1.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (sim.power.double > 0 && !sim.dead) {
      ctx.fillStyle = 'rgba(52,179,122,0.18)';
      ctx.beginPath();
      ctx.ellipse(0.05, 0.9, 0.75, 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawSpeedLines(ctx, sim, t) {
    const k = clamp((sim.speed - 19) / 6, 0, 0.7) + (sim.flying ? 0.6 : 0);
    if (k <= 0.02 || sim.dead) return;
    const { W, H } = this;
    ctx.strokeStyle = `rgba(255,255,255,${0.16 * Math.min(1, k)})`;
    ctx.lineWidth = Math.max(1, H / 500);
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const y = ((i * 0.618 + 0.13) % 1) * H * 0.5 + H * 0.05;
      const len = W * (0.08 + ((i * 0.37) % 0.12));
      const x = W - (((t * 2.6 + i * 0.29) % 1) * (W + len)) ;
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
    }
    ctx.stroke();
  }

  drawVignette(ctx, strength) {
    const { W, H } = this;
    if (!this.vignette || this.vignette.s !== strength) {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(128, 128, 60, 128, 128, 181);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, `rgba(0,0,0,${strength})`);
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 256);
      this.vignette = { c, s: strength };
    }
    ctx.drawImage(this.vignette.c, 0, 0, W, H);
  }
}

export { PHYSICS };
