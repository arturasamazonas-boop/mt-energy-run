// JSON API client.
async function call(method, path, body, options = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const e = new Error(data?.error || `http_${res.status}`);
    e.status = res.status;
    e.code = data?.error;
    e.data = data;
    throw e;
  }
  return data;
}

async function finishRun(runId, summary) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await call('POST', '/api/run/finish', { runId, summary }, { signal: controller.signal, keepalive: true });
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  config: () => call('GET', '/api/config'),
  me: () => call('GET', '/api/me'),
  register: (name) => call('POST', '/api/register', { name }),
  emailCode: (email, lang) => call('POST', '/api/email/code', { email, lang }),
  emailVerify: (challengeId, code, merge) => call('POST', '/api/email/verify', { challengeId, code, merge }),
  logout: () => call('POST', '/api/logout', {}),
  rename: (name) => call('POST', '/api/name', { name }),
  startRun: (mode) => call('POST', '/api/run/start', { mode }),
  finishRun,
  buy: (kind, id) => call('POST', '/api/shop/buy', { kind, id }),
  equip: (id) => call('POST', '/api/equip', { id }),
  leaderboard: (board, limit = 100) => call('GET', `/api/leaderboard?board=${board}&limit=${limit}`),
};
