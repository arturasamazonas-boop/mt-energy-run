// The hero: a friendly cartoon of the MT GROUP founder in his signature navy suit.
// Drawn procedurally with a tiny skeleton. Coordinates: meters, y up, feet at (0,0),
// facing +x. The caller sets up ctx so that 1 unit = 1 meter and y points up.
import { IMAGES } from './buildings.js';

const OUT = '#1A1E29';
const LW = 0.026; // outline width (m)

export const OUTFITS = {
  suit: { jacket: '#24324F', jacketD: '#1A253C', lapel: '#18213A', shirt: '#F6F8FB', pants: '#1F2A42', shoes: '#3A2A20', tie: null, hat: 'helmet', square: true },
  vest: { jacket: '#F6F8FB', jacketD: '#DDE2E8', lapel: '#E6EAEF', shirt: '#F6F8FB', pants: '#1F2A42', shoes: '#3A2A20', vest: true, hat: 'helmet' },
  overalls: { jacket: '#FFD800', jacketD: '#E2BE00', lapel: '#1E1E1E', shirt: '#2B2B2B', pants: '#FFD800', pantsD: '#E2BE00', shoes: '#2A2A2A', overalls: true, hat: 'helmet' },
  tux: { jacket: '#15171C', jacketD: '#0D0F12', lapel: '#2C3038', shirt: '#FFFFFF', pants: '#15171C', shoes: '#0E0E10', bow: '#0E0E10', hat: 'none', square: true },
  birthday: { jacket: '#24324F', jacketD: '#1A253C', lapel: '#18213A', shirt: '#F6F8FB', pants: '#1F2A42', shoes: '#3A2A20', bow: '#E2364B', hat: 'party', square: true },
  gold: { jacket: '#D9AE3E', jacketD: '#B8902C', lapel: '#C59A30', shirt: '#1E1E1E', pants: '#C9A03A', shoes: '#1E1E1E', hat: 'goldhelmet', square: true, shine: true },
};

const SKIN = '#F1C6A8';
const SKIN_D = '#DFA98A';
const HAIR = '#BDB6AA';
const HAIR_L = '#DAD4C8';
const HAIR_D = '#9C958A';
const EYE = '#4C86C8';

// ---------------------------------------------------------------------------
// Poses
// ---------------------------------------------------------------------------
export function runPose(phase, speed01 = 0.5) {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const amp = 0.62 + 0.22 * speed01;
  return {
    hipY: 0.74 + 0.045 * Math.abs(Math.sin(phase)),
    lean: 0.16 + 0.08 * speed01,
    legF: [amp * s, -0.25 - 1.05 * Math.max(0, -c) - 0.15 * Math.max(0, s)],
    legB: [-amp * s, -0.25 - 1.05 * Math.max(0, c) - 0.15 * Math.max(0, -s)],
    armF: [-0.75 * s - 0.1, 1.45],
    armB: [0.75 * s - 0.1, 1.45],
    head: -0.05 + 0.03 * c,
    rot: 0,
  };
}

export function jumpPose(vy, t) {
  const up = vy > 0;
  return {
    hipY: 0.78,
    lean: up ? 0.08 : 0.12,
    legF: up ? [1.05, -1.55] : [0.55, -0.55],
    legB: up ? [-0.25, -1.25] : [-0.15, -0.35],
    armF: up ? [2.5, 0.5] : [1.9 + 0.2 * Math.sin(t * 20), 0.6],
    armB: up ? [-0.9, 0.9] : [2.3 + 0.2 * Math.cos(t * 20), 0.5],
    head: up ? -0.12 : 0.05,
    rot: 0,
  };
}

export function slidePose(t) {
  return {
    hipY: 0.3,
    lean: -1.0,
    legF: [1.45, -0.05],
    legB: [0.75, -1.6],
    armF: [1.3, 0.6],
    armB: [-0.4, 0.2],
    head: 0.45,
    rot: 0,
    slide: true,
    dust: Math.sin(t * 30),
  };
}

export function idlePose(t, wave = 0) {
  const b = Math.sin(t * 2.2);
  return {
    hipY: 0.74 + 0.006 * b,
    lean: 0.02,
    legF: [0.1, -0.05],
    legB: [-0.08, -0.04],
    armF: [0.22 + 0.03 * b, 0.35],
    armB: wave > 0 ? [2.75 + 0.22 * Math.sin(t * 14), 0.75 + 0.3 * Math.sin(t * 14)] : [-0.18 - 0.03 * b, 0.3],
    head: -0.03 + 0.02 * Math.sin(t * 1.3),
    rot: 0,
    breathe: b,
  };
}

export function hangPose(t) {
  return {
    hipY: 0.74,
    lean: 0.05,
    legF: [0.35 + 0.15 * Math.sin(t * 5), -0.6],
    legB: [-0.1 + 0.15 * Math.sin(t * 5 + 1), -0.4],
    armF: [3.0, 0.15],
    armB: [3.25, 0.1],
    head: -0.15,
    rot: 0,
  };
}

export function sitPose() {
  return { hipY: 0.5, lean: 0.05, legF: [1.4, -1.3], legB: [1.3, -1.4], armF: [0.9, 0.8], armB: [0.8, 0.9], head: -0.05, rot: 0 };
}

export function cheerPose(t) {
  return {
    hipY: 0.74,
    lean: -0.05,
    legF: [0.1, -0.05],
    legB: [-0.08, -0.04],
    armF: [2.15 + 0.15 * Math.sin(t * 10), 0.55],
    armB: [3.1 + 0.2 * Math.cos(t * 10), 0.2],
    head: -0.2,
    rot: 0,
  };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
function limb(ctx, pts, col, width) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = width + LW * 2;
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = width;
  ctx.stroke();
}

function shapeFill(ctx, col) {
  ctx.fillStyle = col;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = LW;
  ctx.stroke();
}

/** Angle measured from straight down, positive = forward (+x). */
function seg(x, y, ang, len) {
  return [x + Math.sin(ang) * len, y - Math.cos(ang) * len];
}

function drawLeg(ctx, hip, a, o, far) {
  const [kx, ky] = seg(hip[0], hip[1], a[0], 0.36);
  const [fx, fy] = seg(kx, ky, a[0] + a[1], 0.36);
  const pants = far ? shadeHex(o.pants, -0.18) : o.pants;
  limb(ctx, [hip[0], hip[1], kx, ky, fx, fy], pants, 0.17);
  // shoe: points forward, perpendicular-ish to shin
  const fa = a[0] + a[1] + Math.PI / 2;
  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(-(fa - Math.PI / 2) * 0.6);
  ctx.beginPath();
  ctx.moveTo(-0.07, 0.03);
  ctx.quadraticCurveTo(-0.08, -0.07, 0.02, -0.07);
  ctx.lineTo(0.15, -0.07);
  ctx.quadraticCurveTo(0.2, -0.06, 0.18, 0.0);
  ctx.quadraticCurveTo(0.12, 0.05, 0.02, 0.05);
  ctx.closePath();
  shapeFill(ctx, far ? shadeHex(o.shoes, -0.2) : o.shoes);
  ctx.restore();
}

function drawArm(ctx, sh, a, o, far, lean) {
  const [ex, ey] = seg(sh[0], sh[1], a[0] - lean, 0.27);
  const [hx, hy] = seg(ex, ey, a[0] + a[1] - lean, 0.25);
  const sleeve = far ? shadeHex(o.jacket, -0.2) : o.jacket;
  limb(ctx, [sh[0], sh[1], ex, ey, hx, hy], sleeve, 0.13);
  // cuff
  ctx.beginPath();
  ctx.arc(hx, hy, 0.062, 0, Math.PI * 2);
  shapeFill(ctx, far ? SKIN_D : SKIN);
}

export function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt < 0) {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  } else {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function drawImageUp(ctx, img, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y + h);
  ctx.scale(1, -1);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
}

/**
 * pose: from the *Pose helpers. opts: { outfit, t, blink, shield, invuln, expression }
 */
export function drawCharacter(ctx, pose, opts = {}) {
  const o = OUTFITS[opts.outfit] || OUTFITS.suit;
  const t = opts.t || 0;
  ctx.save();
  if (pose.rot) {
    ctx.translate(0, 0.9);
    ctx.rotate(-pose.rot);
    ctx.translate(0, -0.9);
  }
  const hip = [0, pose.hipY];
  const lean = pose.lean;
  // torso top (shoulder) after lean around hip
  const torsoLen = 0.42;
  const sh = [hip[0] + Math.sin(lean) * torsoLen, hip[1] + Math.cos(lean) * torsoLen];

  // far limbs
  drawArm(ctx, [sh[0] - 0.03, sh[1] - 0.04], pose.armB, o, true, -lean * 0.3);
  drawLeg(ctx, [hip[0] - 0.03, hip[1]], pose.legB, o, true);

  // torso
  ctx.save();
  ctx.translate(hip[0], hip[1]);
  ctx.rotate(-lean);
  const bw = 0.25;
  const breathe = (pose.breathe || 0) * 0.006;
  // jacket body
  ctx.beginPath();
  ctx.moveTo(-bw * 0.95, -0.05);
  ctx.quadraticCurveTo(-bw * 1.05, 0.25, -bw * 0.92, torsoLen + 0.02 + breathe);
  ctx.quadraticCurveTo(0, torsoLen + 0.09 + breathe, bw * 0.95, torsoLen + 0.02 + breathe);
  ctx.quadraticCurveTo(bw * 1.12, 0.22, bw * 1.0, -0.06);
  ctx.quadraticCurveTo(0, -0.12, -bw * 0.95, -0.05);
  ctx.closePath();
  shapeFill(ctx, o.overalls ? o.shirt : o.jacket);
  if (o.shine) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.moveTo(-bw * 0.6, 0.0);
    ctx.lineTo(-bw * 0.2, torsoLen);
    ctx.lineTo(-bw * 0.02, torsoLen);
    ctx.lineTo(-bw * 0.42, 0.0);
    ctx.fill();
  }
  // side shading
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.beginPath();
  ctx.moveTo(-bw * 0.95, -0.05);
  ctx.quadraticCurveTo(-bw * 1.05, 0.25, -bw * 0.92, torsoLen);
  ctx.lineTo(-bw * 0.55, torsoLen);
  ctx.quadraticCurveTo(-bw * 0.7, 0.2, -bw * 0.6, -0.08);
  ctx.closePath();
  ctx.fill();

  if (o.overalls) {
    // bib overalls
    ctx.beginPath();
    ctx.moveTo(-bw * 0.85, -0.06);
    ctx.lineTo(-bw * 0.7, 0.3);
    ctx.lineTo(bw * 0.75, 0.3);
    ctx.lineTo(bw * 0.95, -0.06);
    ctx.closePath();
    shapeFill(ctx, o.jacket);
    limb(ctx, [-bw * 0.55, 0.28, -bw * 0.45, torsoLen + 0.02], o.jacket, 0.05);
    limb(ctx, [bw * 0.6, 0.28, bw * 0.55, torsoLen + 0.02], o.jacket, 0.05);
    if (IMAGES.emblem) drawImageUp(ctx, IMAGES.emblem, -0.02, 0.1, 0.13, 0.142);
  } else {
    // shirt V + collar
    ctx.beginPath();
    ctx.moveTo(-0.02, torsoLen + 0.04);
    ctx.lineTo(0.13, torsoLen + 0.04);
    ctx.lineTo(0.07, torsoLen - 0.2);
    ctx.closePath();
    ctx.fillStyle = o.shirt;
    ctx.fill();
    // lapels
    ctx.fillStyle = o.lapel;
    ctx.beginPath();
    ctx.moveTo(-0.04, torsoLen + 0.04);
    ctx.lineTo(0.06, torsoLen - 0.22);
    ctx.lineTo(0.0, torsoLen - 0.08);
    ctx.lineTo(-0.08, torsoLen - 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0.16, torsoLen + 0.04);
    ctx.lineTo(0.08, torsoLen - 0.22);
    ctx.lineTo(0.17, torsoLen - 0.09);
    ctx.lineTo(0.22, torsoLen - 0.02);
    ctx.closePath();
    ctx.fill();
    // open collar points
    ctx.fillStyle = o.shirt;
    ctx.beginPath();
    ctx.moveTo(-0.01, torsoLen + 0.05);
    ctx.lineTo(0.035, torsoLen - 0.04);
    ctx.lineTo(0.06, torsoLen + 0.03);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0.14, torsoLen + 0.05);
    ctx.lineTo(0.1, torsoLen - 0.04);
    ctx.lineTo(0.075, torsoLen + 0.03);
    ctx.fill();
    if (o.bow) {
      ctx.fillStyle = o.bow;
      ctx.beginPath();
      ctx.moveTo(0.065, torsoLen - 0.005);
      ctx.lineTo(0.0, torsoLen + 0.03);
      ctx.lineTo(0.0, torsoLen - 0.04);
      ctx.closePath();
      ctx.moveTo(0.065, torsoLen - 0.005);
      ctx.lineTo(0.13, torsoLen + 0.03);
      ctx.lineTo(0.13, torsoLen - 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0.065, torsoLen - 0.005, 0.018, 0, Math.PI * 2);
      ctx.fill();
    }
    // buttons
    ctx.fillStyle = shadeHex(o.lapel, 0.25);
    for (const y of [0.12, 0.02]) {
      ctx.beginPath();
      ctx.arc(0.075, y, 0.014, 0, Math.PI * 2);
      ctx.fill();
    }
    // pocket square (white with little dots, like the photos)
    if (o.square) {
      // folded pocket square with a small floral print (as in the photos)
      ctx.beginPath();
      ctx.moveTo(-0.175, 0.245);
      ctx.lineTo(-0.165, 0.29);
      ctx.lineTo(-0.145, 0.27);
      ctx.lineTo(-0.125, 0.305);
      ctx.lineTo(-0.105, 0.275);
      ctx.lineTo(-0.08, 0.295);
      ctx.lineTo(-0.07, 0.245);
      ctx.closePath();
      ctx.fillStyle = '#EFEBE3';
      ctx.fill();
      const dots = [[-0.16, 0.262, '#C0563E'], [-0.14, 0.255, '#3F64A8'], [-0.12, 0.27, '#C0563E'], [-0.1, 0.258, '#6A8F4E'], [-0.085, 0.27, '#3F64A8'], [-0.128, 0.288, '#6A8F4E']];
      for (const [x, y, c] of dots) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x, y, 0.007, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-0.185, 0.236, 0.125, 0.012);
    }
    if (o.vest) {
      // hi-vis vest over the shirt
      ctx.beginPath();
      ctx.moveTo(-bw * 0.95, -0.04);
      ctx.lineTo(-bw * 0.9, torsoLen);
      ctx.lineTo(-0.03, torsoLen);
      ctx.lineTo(0.04, 0.08);
      ctx.lineTo(0.1, torsoLen);
      ctx.lineTo(bw * 0.95, torsoLen);
      ctx.lineTo(bw, -0.05);
      ctx.closePath();
      shapeFill(ctx, '#FFD800');
      ctx.fillStyle = '#D5DBE1';
      ctx.fillRect(-bw * 0.95, 0.08, bw * 0.95 * 2, 0.035);
      ctx.fillRect(-bw * 0.95, 0.18, bw * 0.95 * 2, 0.035);
      ctx.fillStyle = '#1E1E1E';
      ctx.font = '700 0.06px sans-serif';
      if (IMAGES.emblem) drawImageUp(ctx, IMAGES.emblem, -0.17, 0.24, 0.08, 0.087);
    }
  }
  ctx.restore();

  // near leg
  drawLeg(ctx, [hip[0] + 0.03, hip[1]], pose.legF, o, false);

  // head
  const neck = [sh[0] + 0.02, sh[1] + 0.03];
  const headC = [neck[0] + Math.sin(lean * 0.6 + pose.head) * 0.3 + 0.02, neck[1] + Math.cos(lean * 0.6 + pose.head) * 0.3];
  drawHead(ctx, headC, pose.head + lean * 0.35, o, opts);

  // near arm
  drawArm(ctx, [sh[0] + 0.02, sh[1] - 0.04], pose.armF, o, false, -lean * 0.3);

  ctx.restore();
  void t;
}

function drawHead(ctx, c, tilt, o, opts) {
  const blink = opts.blink;
  ctx.save();
  ctx.translate(c[0], c[1]);
  ctx.rotate(-tilt);
  const rx = 0.285;
  const ry = 0.305;
  // neck
  ctx.beginPath();
  ctx.moveTo(-0.07, -ry * 0.7);
  ctx.lineTo(-0.06, -ry - 0.09);
  ctx.lineTo(0.09, -ry - 0.09);
  ctx.lineTo(0.1, -ry * 0.7);
  ctx.closePath();
  shapeFill(ctx, SKIN_D);

  const hat = o.hat;
  // hair at the back of the head (cropped short)
  ctx.beginPath();
  ctx.ellipse(-0.03, 0.02, rx * 1.03, ry * 1.01, 0, Math.PI * 0.28, Math.PI * 1.3);
  ctx.closePath();
  shapeFill(ctx, HAIR_D);
  // face
  ctx.beginPath();
  ctx.ellipse(0.0, 0.0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = SKIN;
  ctx.fill();
  // jaw shading on the far side (clipped to the face)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0.0, 0.0, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(190,120,95,0.2)';
  ctx.beginPath();
  ctx.ellipse(-0.16, -0.06, rx * 0.62, ry * 0.9, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0.0, 0.0, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = LW;
  ctx.stroke();

  // hair: short grey-blond, tidy, slightly lifted at the front, receding temples
  ctx.beginPath();
  ctx.moveTo(-rx * 1.0, 0.0);
  ctx.quadraticCurveTo(-rx * 1.08, ry * 0.95, -0.04, ry * 1.1);
  ctx.quadraticCurveTo(0.12, ry * 1.18, 0.2, ry * 0.98);
  ctx.quadraticCurveTo(0.235, ry * 0.86, 0.2, ry * 0.74);
  ctx.quadraticCurveTo(0.15, ry * 0.8, 0.11, ry * 0.66);
  ctx.quadraticCurveTo(0.05, ry * 0.72, 0.0, ry * 0.6);
  ctx.quadraticCurveTo(-0.07, ry * 0.5, -0.12, ry * 0.36);
  ctx.quadraticCurveTo(-0.15, 0.06, -0.165, -0.04);
  ctx.quadraticCurveTo(-rx * 0.88, -0.06, -rx * 1.0, 0.0);
  ctx.closePath();
  shapeFill(ctx, HAIR);
  ctx.strokeStyle = HAIR_L;
  ctx.lineWidth = 0.016;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const x = -0.2 + i * 0.065;
    ctx.moveTo(x, ry * (0.62 + (i % 2) * 0.1));
    ctx.quadraticCurveTo(x + 0.03, ry * 0.95, x + 0.07, ry * (1.02 - (i % 3) * 0.04));
  }
  ctx.stroke();
  // sideburn
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.moveTo(-0.06, 0.12);
  ctx.quadraticCurveTo(-0.03, 0.02, -0.045, -0.06);
  ctx.lineTo(-0.075, -0.05);
  ctx.quadraticCurveTo(-0.08, 0.05, -0.1, 0.1);
  ctx.closePath();
  ctx.fill();

  // ear
  ctx.beginPath();
  ctx.ellipse(-0.1, -0.005, 0.05, 0.07, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.015;
  ctx.stroke();
  ctx.fillStyle = SKIN_D;
  ctx.beginPath();
  ctx.ellipse(-0.098, -0.005, 0.022, 0.036, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // cheeks
  ctx.fillStyle = 'rgba(232,120,110,0.28)';
  ctx.beginPath();
  ctx.ellipse(0.08, -0.07, 0.06, 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0.245, -0.07, 0.03, 0.035, 0, 0, Math.PI * 2);
  ctx.fill();

  // eyes (near / far)
  const eyes = [
    [0.105, 0.035, 1],
    [0.225, 0.035, 0.72],
  ];
  for (const [ex, ey, k] of eyes) {
    if (blink) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 0.014;
      ctx.beginPath();
      ctx.moveTo(ex - 0.03 * k, ey);
      ctx.quadraticCurveTo(ex, ey - 0.015, ex + 0.03 * k, ey);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 0.036 * k, 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = EYE;
    ctx.beginPath();
    ctx.arc(ex + 0.008 * k, ey - 0.002, 0.021 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1C2333';
    ctx.beginPath();
    ctx.arc(ex + 0.01 * k, ey - 0.002, 0.01 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ex + 0.016 * k, ey + 0.008, 0.006, 0, Math.PI * 2);
    ctx.fill();
    // upper lid line (friendly, slightly squinting smile-eyes)
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.moveTo(ex - 0.038 * k, ey + 0.008);
    ctx.quadraticCurveTo(ex, ey + 0.036, ex + 0.038 * k, ey + 0.01);
    ctx.stroke();
  }
  // brows: light, soft
  ctx.strokeStyle = '#9A8F80';
  ctx.lineWidth = 0.02;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.07, 0.1);
  ctx.quadraticCurveTo(0.105, 0.118, 0.145, 0.105);
  ctx.moveTo(0.2, 0.105);
  ctx.quadraticCurveTo(0.23, 0.115, 0.255, 0.1);
  ctx.stroke();

  // nose: soft bump on the profile line
  ctx.beginPath();
  ctx.moveTo(0.262, 0.035);
  ctx.quadraticCurveTo(0.272, -0.005, 0.305, -0.035);
  ctx.quadraticCurveTo(0.315, -0.062, 0.272, -0.066);
  ctx.quadraticCurveTo(0.25, -0.07, 0.24, -0.055);
  ctx.closePath();
  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.014;
  ctx.beginPath();
  ctx.moveTo(0.27, 0.0);
  ctx.quadraticCurveTo(0.29, -0.015, 0.305, -0.035);
  ctx.quadraticCurveTo(0.315, -0.062, 0.272, -0.066);
  ctx.stroke();
  ctx.fillStyle = 'rgba(170,95,75,0.45)';
  ctx.beginPath();
  ctx.ellipse(0.262, -0.055, 0.016, 0.009, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // mouth: wide, warm smile
  const expr = opts.expression || 'smile';
  if (expr === 'ouch') {
    ctx.fillStyle = '#7A2E2E';
    ctx.beginPath();
    ctx.ellipse(0.17, -0.15, 0.035, 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(0.075, -0.115);
    ctx.quadraticCurveTo(0.16, -0.205, 0.255, -0.12);
    ctx.quadraticCurveTo(0.17, -0.15, 0.075, -0.115);
    ctx.fillStyle = expr === 'grin' ? '#7A2E2E' : '#FFFFFF';
    ctx.fill();
    if (expr === 'grin') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(0.085, -0.118);
      ctx.quadraticCurveTo(0.17, -0.155, 0.245, -0.123);
      ctx.lineTo(0.235, -0.14);
      ctx.quadraticCurveTo(0.17, -0.16, 0.095, -0.13);
      ctx.fill();
    }
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.015;
    ctx.beginPath();
    ctx.moveTo(0.075, -0.115);
    ctx.quadraticCurveTo(0.16, -0.205, 0.255, -0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.065, -0.105);
    ctx.quadraticCurveTo(0.07, -0.12, 0.08, -0.125);
    ctx.stroke();
  }
  // subtle chin line
  ctx.strokeStyle = 'rgba(190,120,95,0.45)';
  ctx.lineWidth = 0.01;
  ctx.beginPath();
  ctx.moveTo(0.1, -0.245);
  ctx.quadraticCurveTo(0.17, -0.27, 0.22, -0.235);
  ctx.stroke();

  // headwear
  if (hat === 'helmet' || hat === 'goldhelmet') drawHelmet(ctx, rx, ry, hat === 'goldhelmet', opts);
  else if (hat === 'party') drawPartyHat(ctx, rx, ry, opts.t || 0);
  ctx.restore();
}

function drawHelmet(ctx, rx, ry, gold, opts) {
  const col = gold ? '#E7BE45' : '#FFD800';
  const colD = gold ? '#B8902C' : '#E0B800';
  // dome
  ctx.beginPath();
  ctx.moveTo(-rx * 1.08, ry * 0.66);
  ctx.bezierCurveTo(-rx * 1.1, ry * 1.75, rx * 1.08, ry * 1.8, rx * 1.02, ry * 0.74);
  ctx.closePath();
  shapeFill(ctx, col);
  // ridge
  ctx.fillStyle = colD;
  ctx.beginPath();
  ctx.moveTo(-0.03, ry * 1.5);
  ctx.quadraticCurveTo(0.03, ry * 1.56, 0.09, ry * 1.48);
  ctx.lineTo(0.09, ry * 0.79);
  ctx.lineTo(-0.03, ry * 0.79);
  ctx.closePath();
  ctx.fill();
  // highlight
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-0.12, ry * 1.3, 0.05, 0.09, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // brim
  ctx.beginPath();
  ctx.moveTo(-rx * 1.18, ry * 0.66);
  ctx.quadraticCurveTo(0, ry * 0.6, rx * 1.38, ry * 0.66);
  ctx.quadraticCurveTo(rx * 1.42, ry * 0.76, rx * 1.2, ry * 0.79);
  ctx.quadraticCurveTo(0, ry * 0.5, -rx * 1.12, ry * 0.79);
  ctx.closePath();
  shapeFill(ctx, colD);
  // MT emblem decal
  ctx.fillStyle = '#1E1E1E';
  ctx.beginPath();
  ctx.ellipse(0.17, ry * 1.12, 0.075, 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  if (IMAGES.emblem) {
    const h = 0.09;
    const w = h * (IMAGES.emblem.width / IMAGES.emblem.height);
    drawImageUp(ctx, IMAGES.emblem, 0.17 - w / 2, ry * 1.12 - h / 2, w, h);
  }
  if (opts.shield) {
    ctx.strokeStyle = 'rgba(255,240,150,0.9)';
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.ellipse(0, ry * 1.1, rx * 1.35, ry * 0.85, 0, 0, Math.PI);
    ctx.stroke();
  }
}

function drawPartyHat(ctx, rx, ry, t) {
  ctx.save();
  ctx.translate(0.02, ry * 0.75);
  ctx.rotate(-0.15);
  ctx.beginPath();
  ctx.moveTo(-0.15, 0);
  ctx.lineTo(0.02, 0.42);
  ctx.lineTo(0.17, 0);
  ctx.closePath();
  shapeFill(ctx, '#3F64A8');
  ctx.save();
  ctx.clip();
  const cols = ['#FFD800', '#E2364B', '#34B37A'];
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = cols[i % 3];
    ctx.beginPath();
    ctx.moveTo(-0.2, i * 0.08 - 0.02);
    ctx.lineTo(0.25, i * 0.08 + 0.06);
    ctx.lineTo(0.25, i * 0.08 + 0.1);
    ctx.lineTo(-0.2, i * 0.08 + 0.02);
    ctx.fill();
  }
  ctx.restore();
  const wob = Math.sin(t * 12) * 0.02;
  ctx.fillStyle = '#FFD800';
  ctx.beginPath();
  ctx.arc(0.02 + wob, 0.44, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = LW * 0.8;
  ctx.stroke();
  ctx.restore();
  void rx;
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------
export function drawDrone(ctx, t, y = 2.05) {
  ctx.save();
  ctx.translate(0.05, y);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = LW;
  // arms
  limb(ctx, [-0.55, 0.05, 0.55, 0.05], '#2C2F36', 0.06);
  // body
  ctx.beginPath();
  ctx.ellipse(0, 0.02, 0.22, 0.1, 0, 0, Math.PI * 2);
  shapeFill(ctx, '#FFD800');
  ctx.fillStyle = '#1E1E1E';
  ctx.fillRect(-0.08, -0.02, 0.16, 0.05);
  // rotors
  for (const x of [-0.55, 0.55]) {
    ctx.fillStyle = '#2C2F36';
    ctx.fillRect(x - 0.02, 0.05, 0.04, 0.08);
    const w = 0.32 * Math.abs(Math.cos(t * 50 + x));
    ctx.fillStyle = 'rgba(40,44,52,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, 0.14, Math.max(0.05, w), 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,210,220,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, 0.14, 0.34, 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // grip bar
  limb(ctx, [-0.12, -0.08, -0.12, -0.3, 0.16, -0.3, 0.16, -0.08], '#3A3E46', 0.03);
  // blinking light
  ctx.fillStyle = Math.sin(t * 8) > 0 ? '#FF3B30' : '#5A1A16';
  ctx.beginPath();
  ctx.arc(0.2, 0.0, 0.025, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Mini excavator with the hero in the cab. Origin = ground under the cab. */
export function drawExcavator(ctx, t, outfit, blink) {
  ctx.save();
  // tracks
  ctx.beginPath();
  ctx.moveTo(-0.9, 0.0);
  ctx.lineTo(0.9, 0.0);
  ctx.quadraticCurveTo(1.1, 0.18, 0.9, 0.36);
  ctx.lineTo(-0.9, 0.36);
  ctx.quadraticCurveTo(-1.1, 0.18, -0.9, 0.0);
  shapeFill(ctx, '#2B2D31');
  ctx.fillStyle = '#4A4D53';
  for (let i = 0; i < 6; i++) {
    const x = -0.75 + ((i * 0.3 + t * 3) % 1.8);
    ctx.beginPath();
    ctx.arc(x, 0.18, 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  // body
  ctx.beginPath();
  ctx.moveTo(-0.85, 0.36);
  ctx.lineTo(0.75, 0.36);
  ctx.lineTo(0.75, 0.8);
  ctx.lineTo(-0.85, 0.8);
  ctx.closePath();
  shapeFill(ctx, '#FFD800');
  ctx.fillStyle = '#1E1E1E';
  ctx.fillRect(-0.85, 0.36, 1.6, 0.08);
  if (IMAGES.emblem) drawImageUp(ctx, IMAGES.emblem, -0.75, 0.48, 0.24, 0.26);
  // character sitting
  ctx.save();
  ctx.translate(0.05, 0.42);
  ctx.scale(0.92, 0.92);
  drawCharacter(ctx, sitPose(), { outfit, t, blink });
  ctx.restore();
  // cab frame
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(-0.45, 0.8);
  ctx.lineTo(-0.45, 2.0);
  ctx.lineTo(0.55, 2.0);
  ctx.lineTo(0.62, 0.8);
  ctx.stroke();
  ctx.fillStyle = '#FFD800';
  ctx.fillRect(-0.55, 1.98, 1.2, 0.1);
  // arm + bucket
  const sw = Math.sin(t * 9) * 0.25;
  ctx.save();
  ctx.translate(0.7, 0.75);
  ctx.rotate(0.5 + sw * 0.4);
  limb(ctx, [0, 0, 0.9, 0.35], '#FFD800', 0.16);
  ctx.translate(0.9, 0.35);
  ctx.rotate(-1.4 - sw);
  limb(ctx, [0, 0, 0.7, 0], '#FFD800', 0.12);
  ctx.translate(0.7, 0);
  ctx.beginPath();
  ctx.moveTo(0, 0.12);
  ctx.lineTo(0.32, 0.05);
  ctx.lineTo(0.28, -0.28);
  ctx.lineTo(-0.05, -0.15);
  ctx.closePath();
  shapeFill(ctx, '#3A3C40');
  ctx.restore();
  ctx.restore();
}

/** Golden protective bubble when the helmet power-up is active. */
export function drawShield(ctx, t) {
  ctx.save();
  const a = 0.35 + 0.1 * Math.sin(t * 6);
  const g = ctx.createRadialGradient(0.05, 0.95, 0.4, 0.05, 0.95, 1.15);
  g.addColorStop(0, 'rgba(255,216,0,0)');
  g.addColorStop(0.8, `rgba(255,216,0,${a * 0.35})`);
  g.addColorStop(1, `rgba(255,236,120,${a})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0.05, 0.95, 0.85, 1.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
