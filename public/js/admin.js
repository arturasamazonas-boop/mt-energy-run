// Minimal admin console (players, bans, renames, flagged runs).
const $ = (s) => document.querySelector(s);
let token = sessionStorage.getItem('mter-admin') || '';
let data = null;

async function call(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'x-admin-token': token, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw Object.assign(new Error(String(res.status)), { status: res.status });
  return res.json();
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const date = (d) => (d ? new Date(d).toLocaleString('lt-LT') : '');

async function load() {
  try {
    data = await call('GET', '/api/admin/overview');
  } catch (e) {
    $('#login').hidden = false;
    $('#app').hidden = true;
    $('.err').textContent = e.status === 403 ? 'Neteisingas raktas (arba ADMIN_TOKEN nenustatytas serveryje).' : 'Klaida';
    return;
  }
  sessionStorage.setItem('mter-admin', token);
  $('#login').hidden = true;
  $('#app').hidden = false;
  render();
}

function render() {
  const q = $('#q').value.trim().toLowerCase();
  $('.kpis').innerHTML = `<div class="kpi">Žaidėjų<b>${data.counts.players}</b></div><div class="kpi">Bėgimų<b>${data.counts.runs}</b></div><div class="kpi">Įtartinų<b>${data.flagged.length}</b></div>`;
  const players = [...data.players]
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => (a.best?.rank ?? 1e9) - (b.best?.rank ?? 1e9));
  $('#players tbody').innerHTML = players
    .map(
      (p) => `<tr class="${p.banned ? 'banned' : ''}" data-id="${p.id}">
      <td>${p.best ? p.best.rank : '–'}</td><td>${esc(p.name)}</td><td>${p.best ? p.best.score.toLocaleString('lt-LT') : '–'}</td>
      <td>${p.runs}</td><td>${p.energy}</td><td>${date(p.createdAt)}</td><td>${date(p.lastSeen)}</td>
      <td><div class="acts"><button class="ghost" data-a="rename">Pervadinti</button><button class="ghost" data-a="ban">${p.banned ? 'Atblokuoti' : 'Blokuoti'}</button><button class="danger" data-a="del">Ištrinti</button></div></td></tr>`,
    )
    .join('');
  $('#flagged tbody').innerHTML = data.flagged
    .map((r) => `<tr data-run="${r.id}"><td>${esc(r.name)}</td><td>${r.score}</td><td>${r.distance} m</td><td>${esc(r.flags)}</td><td>${date(r.finishedAt)}</td><td><button class="ghost" data-a="valid">Įskaityti</button></td></tr>`)
    .join('') || '<tr><td colspan="6">Nėra</td></tr>';
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-a]');
  if (!b) return;
  const tr = b.closest('tr');
  const id = tr.dataset.id;
  const p = data.players.find((x) => x.id === id);
  try {
    if (b.dataset.a === 'rename') {
      const name = prompt('Naujas vardas', p.name);
      if (name) await call('POST', '/api/admin/rename', { playerId: id, name });
    } else if (b.dataset.a === 'ban') await call('POST', '/api/admin/ban', { playerId: id, banned: !p.banned });
    else if (b.dataset.a === 'del') {
      if (!confirm(`Ištrinti žaidėją „${p.name}“ ir visus jo rezultatus?`)) return;
      await call('POST', '/api/admin/delete-player', { playerId: id });
    } else if (b.dataset.a === 'valid') await call('POST', '/api/admin/run-valid', { runId: tr.dataset.run, valid: true });
  } catch (err) {
    alert(`Nepavyko: ${err.message}`);
  }
  load();
});

$('#login').addEventListener('submit', (e) => {
  e.preventDefault();
  token = e.target.token.value.trim();
  load();
});
$('#reload').addEventListener('click', load);
$('#q').addEventListener('input', render);
if (token) load();
