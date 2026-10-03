// Email verification (one-time 6-digit codes sent through Resend), same model as
// Penktas Gurkšnis: the browser keeps the account; email is optional protection.
import crypto from 'node:crypto';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const RESEND_AFTER_S = 60;

export function normalizeEmail(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

export function maskEmail(e) {
  if (!e) return null;
  const [u, d] = e.split('@');
  return `${u.slice(0, 2)}•••@${d}`;
}

export function newCode() {
  return String(crypto.randomInt(1000000)).padStart(6, '0');
}

export function makeHasher(secret) {
  const key = secret && secret.length >= 32 ? secret : crypto.randomBytes(32).toString('hex');
  return (s) => crypto.createHmac('sha256', key).update(s).digest('hex');
}

export function sameHash(a, b) {
  return typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function template(code, lang) {
  const lt = lang !== 'en';
  const subject = lt ? `${code} – MT GROUP Energy Run` : `${code} – MT GROUP Energy Run`;
  const text = lt
    ? `Tavo patvirtinimo kodas: ${code}\n\nGalioja 10 minučių. Jei kodo neprašei, šį laišką ignoruok. Kodo niekam neperduok.`
    : `Your verification code: ${code}\n\nValid for 10 minutes. If you did not request it, ignore this email. Never share the code.`;
  const html = `<div style="background:#1E1E1E;color:#F5F6F8;padding:36px;font-family:Arial,sans-serif;border-top:6px solid #FFD800">
  <p style="color:#FFD800;font-weight:bold;letter-spacing:3px;margin:0 0 18px">MT GROUP · ENERGY RUN</p>
  <h1 style="margin:0 0 12px;font-size:24px">${lt ? 'Apsaugok savo bėgimą.' : 'Protect your run.'}</h1>
  <p style="margin:0 0 8px">${lt ? 'Tavo vienkartinis patvirtinimo kodas' : 'Your one-time verification code'}</p>
  <p style="font-size:38px;letter-spacing:10px;font-weight:bold;color:#FFD800;margin:8px 0 18px">${code}</p>
  <p style="margin:0 0 8px">${lt ? 'Galioja 10 minučių. Slaptažodžio nereikia.' : 'Valid for 10 minutes. No password needed.'}</p>
  <p style="color:#A9AFB8;margin:0">${lt ? 'Jei kodo neprašei, ignoruok šį laišką. Kodo niekam neperduok.' : 'If you did not request this code, ignore this email. Never share it.'}</p></div>`;
  return { subject, text, html };
}

/** Returns a sendCode({ email, code, id, lang }) function, or null when not configured. */
export function resendSender(env = process.env) {
  if (!env.RESEND_API_KEY || !env.ACCOUNT_EMAIL_FROM) return null;
  return async ({ email, code, id, lang }) => {
    const { subject, text, html } = template(code, lang);
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(12000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': id },
      body: JSON.stringify({ from: env.ACCOUNT_EMAIL_FROM, to: [email], subject, text, html }),
    });
    if (!r.ok) throw new Error(`email_rejected_${r.status}`);
  };
}
