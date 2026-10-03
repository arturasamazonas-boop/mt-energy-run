// Art review page: /dev/preview.html?view=character|outfits|face|expressions|landmarks
import { loadImages } from '../js/render/buildings.js';
import { drawCharacter, runPose, jumpPose, slidePose, idlePose, hangPose, cheerPose, drawDrone, drawExcavator, OUTFITS } from '../js/render/character.js';
import { LANDMARKS, makeG, landmarkColors } from '../js/render/landmarks.js';

const params = new URLSearchParams(location.search);
const view = params.get('view') || 'character';
const cv = document.getElementById('c');
const W = Number(params.get('w')) || 1400;
const H = Number(params.get('h')) || 900;
cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
const outfit = params.get('outfit') || 'suit';
const opts = { outfit, expression: params.get('expression') || 'smile', blink: params.has('blink') };
await loadImages();
await document.fonts.ready;

function at(x, y, s, fn) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, -s); fn(); ctx.restore();
}

if (view === 'character') {
  ctx.fillStyle = '#9CC9E8'; ctx.fillRect(0, 0, W, H);
  at(230, 820, 380, () => drawCharacter(ctx, idlePose(0.4), opts));
  const poses = [runPose(0), runPose(1.2), runPose(2.4), runPose(3.6), jumpPose(5, 0), jumpPose(-5, 0), slidePose(0), cheerPose(0)];
  poses.forEach((p, i) => at(520 + (i % 4) * 220, 380 + Math.floor(i / 4) * 300, 130, () => drawCharacter(ctx, p, opts)));
  at(1300, 380, 90, () => { drawDrone(ctx, 0); drawCharacter(ctx, hangPose(0), opts); });
} else if (view === 'outfits') {
  ctx.fillStyle = '#9CC9E8'; ctx.fillRect(0, 0, W, H);
  Object.keys(OUTFITS).forEach((o, i) => at(130 + i * 210, 600, 230, () => drawCharacter(ctx, idlePose(0.2), { ...opts, outfit: o })));
  at(300, 860, 110, () => drawExcavator(ctx, 0, 'suit'));
} else if (view === 'face') {
  ctx.fillStyle = '#9CC9E8'; ctx.fillRect(0, 0, W, H);
  // Uncovered hair and the in-game helmet at the same scale, without clipping the hat.
  at(330, 1680, 850, () => drawCharacter(ctx, idlePose(0.2), { ...opts, outfit: 'tux' }));
  at(1000, 1680, 850, () => drawCharacter(ctx, idlePose(0.2), opts));
} else if (view === 'expressions') {
  ctx.fillStyle = '#9CC9E8'; ctx.fillRect(0, 0, W, H);
  const variants = [{ expression: 'smile' }, { expression: 'grin' }, { expression: 'ouch' }, { expression: 'smile', blink: true }];
  variants.forEach((v, i) => {
    ctx.save(); ctx.beginPath(); ctx.rect(i * 350, 80, 350, 540); ctx.clip();
    at(170 + i * 350, 1070, 530, () => drawCharacter(ctx, idlePose(0.2), { outfit, ...v }));
    ctx.restore();
    ctx.fillStyle = '#1A1E29'; ctx.font = '18px sans-serif';
    ctx.fillText(v.blink ? 'blink' : v.expression, 130 + i * 350, 50);
    // The same expression at typical gameplay scale.
    at(170 + i * 350, 830, 48, () => drawCharacter(ctx, runPose(1.2), { outfit, ...v }));
  });
} else if (view === 'landmarks') {
  ctx.fillStyle = '#C8DCEB'; ctx.fillRect(0, 0, W, H);
  const ids = Object.keys(LANDMARKS);
  const cols = 9; const cw = W / cols; const rh = H / Math.ceil(ids.length / cols);
  const c = landmarkColors('#8FA6B8');
  ids.forEach((id, i) => {
    const L = LANDMARKS[id];
    const s = Math.min((cw - 16) / L.w, (rh - 26) / L.h);
    const x = (i % cols) * cw + (cw - L.w * s) / 2;
    const y = Math.floor(i / cols) * rh + rh - 4;
    at(x, y, s, () => L.draw(makeG(ctx, c)));
    ctx.fillStyle = '#222'; ctx.font = '11px sans-serif'; ctx.fillText(id, (i % cols) * cw + 4, Math.floor(i / cols) * rh + 12);
  });
}
window.__ready = true;
