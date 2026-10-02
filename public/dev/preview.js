// Art review page: /dev/preview.html?view=character|landmarks|obstacles
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
await loadImages();
await document.fonts.ready;

function at(x, y, s, fn) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, -s); fn(); ctx.restore();
}

if (view === 'character') {
  ctx.fillStyle = '#9CC9E8'; ctx.fillRect(0, 0, W, H);
  at(230, 820, 380, () => drawCharacter(ctx, idlePose(0.4), { outfit: params.get('outfit') || 'suit' }));
  const poses = [runPose(0), runPose(1.2), runPose(2.4), runPose(3.6), jumpPose(5, 0), jumpPose(-5, 0), slidePose(0), cheerPose(0)];
  poses.forEach((p, i) => at(520 + (i % 4) * 220, 380 + Math.floor(i / 4) * 300, 130, () => drawCharacter(ctx, p, { outfit: 'suit' })));
  at(1300, 380, 90, () => { drawDrone(ctx, 0); drawCharacter(ctx, hangPose(0), { outfit: 'suit' }); });
} else if (view === 'outfits') {
  ctx.fillStyle = '#9CC9E8'; ctx.fillRect(0, 0, W, H);
  Object.keys(OUTFITS).forEach((o, i) => at(130 + i * 210, 600, 230, () => drawCharacter(ctx, idlePose(0.2), { outfit: o })));
  at(300, 860, 110, () => drawExcavator(ctx, 0, 'suit'));
} else if (view === 'face') {
  ctx.fillStyle = '#9CC9E8'; ctx.fillRect(0, 0, W, H);
  at(500, 2300, 1300, () => drawCharacter(ctx, idlePose(0.2), { outfit: params.get('outfit') || 'suit' }));
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
