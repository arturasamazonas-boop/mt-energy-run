// Optional email protection / sign-in dialog (one-time 6-digit code).
import { api } from '../api.js';
import { t, getLang } from '../i18n.js';
import { ICON } from './icons.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function errorText(ex) {
  switch (ex.code) {
    case 'bad_email':
      return t('emailBad');
    case 'bad_code':
      return t('emailBadCode');
    case 'code_expired':
      return t('emailExpired');
    case 'rate_limited':
      return t('rateLimited');
    case 'already_secured':
      return t('emailAlready');
    case 'no_account':
      return t('emailNoAccount');
    case 'send_failed':
      return t('emailSendFailed');
    case 'email_disabled':
      return t('emailDisabled');
    default:
      return t('offline');
  }
}

/**
 * mode: 'protect' (attach email to this browser's account) or 'login' (sign in on a new device).
 * Resolves onDone(profile) after a successful verification.
 */
export function emailDialog(root, { mode = 'protect', onDone, onCancel }) {
  const wrap = document.createElement('div');
  wrap.className = 'overlay email-dialog';
  root.appendChild(wrap);
  let challengeId = null;
  let email = '';
  let timer = 0;
  const close = () => {
    clearInterval(timer);
    wrap.remove();
  };

  const stepEmail = (msg = '') => {
    wrap.innerHTML = `
      <form class="panel dialog" autocomplete="on">
        <h2>${mode === 'login' ? t('emailLoginTitle') : t('emailProtectTitle')}</h2>
        <p class="muted">${mode === 'login' ? t('emailLoginText') : t('emailProtectText')}</p>
        <input class="field" type="email" name="email" autocomplete="email" inputmode="email" placeholder="${t('emailPh')}" value="${esc(email)}" required>
        <div class="error">${esc(msg)}</div>
        <div class="row">
          <button class="btn primary" type="submit">${t('emailSend')}</button>
          <button class="btn ghost" type="button" data-cancel>${t('back')}</button>
        </div>
      </form>`;
    const form = wrap.querySelector('form');
    setTimeout(() => form.email.focus(), 30);
    wrap.querySelector('[data-cancel]').addEventListener('click', () => {
      close();
      onCancel?.();
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      email = form.email.value.trim();
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const r = await api.emailCode(email, getLang());
        challengeId = r.challengeId;
        stepCode('', r.retryAfter || 60);
      } catch (ex) {
        btn.disabled = false;
        form.querySelector('.error').textContent = errorText(ex);
      }
    });
  };

  const stepCode = (msg = '', wait = 60) => {
    wrap.innerHTML = `
      <form class="panel dialog" autocomplete="off">
        <h2>${t('emailCodeTitle')}</h2>
        <p class="muted">${t('emailCodeText').replace('{email}', `<b>${esc(email)}</b>`)}</p>
        <input class="field code-input" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" placeholder="••••••" required>
        <div class="error">${esc(msg)}</div>
        <div class="row">
          <button class="btn primary" type="submit">${t('emailVerify')}</button>
          <button class="btn ghost" type="button" data-resend disabled></button>
        </div>
        <button class="link" type="button" data-change>${t('emailChange')}</button>
      </form>`;
    const form = wrap.querySelector('form');
    const resend = wrap.querySelector('[data-resend]');
    setTimeout(() => form.code.focus(), 30);
    let left = wait;
    const tick = () => {
      resend.disabled = left > 0;
      resend.textContent = left > 0 ? `${t('emailResend')} (${left})` : t('emailResend');
      left--;
    };
    clearInterval(timer);
    tick();
    timer = setInterval(tick, 1000);
    resend.addEventListener('click', async () => {
      try {
        const r = await api.emailCode(email, getLang());
        challengeId = r.challengeId;
        stepCode(t('emailSentAgain'), r.retryAfter || 60);
      } catch (ex) {
        form.querySelector('.error').textContent = errorText(ex);
      }
    });
    wrap.querySelector('[data-change]').addEventListener('click', () => {
      clearInterval(timer);
      stepEmail();
    });
    form.code.addEventListener('input', () => {
      form.code.value = form.code.value.replace(/\D/g, '').slice(0, 6);
      if (form.code.value.length === 6) form.requestSubmit();
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const r = await api.emailVerify(challengeId, form.code.value, false);
        if (r.needsMerge) return stepMerge(r);
        close();
        onDone?.(r.profile);
      } catch (ex) {
        btn.disabled = false;
        const left = ex.data?.attemptsLeft;
        form.querySelector('.error').textContent = errorText(ex) + (Number.isFinite(left) && ex.code === 'bad_code' ? ` (${t('emailAttempts')}: ${left})` : '');
        form.code.select();
      }
    });
  };

  const stepMerge = (r) => {
    clearInterval(timer);
    wrap.innerHTML = `
      <div class="panel dialog">
        <h2>${t('emailMergeTitle')}</h2>
        <p>${t('emailMergeText').replace('{target}', `<b>${esc(r.targetName)}</b>`).replace('{guest}', `<b>${esc(r.guestName)}</b>`)}</p>
        <div class="error"></div>
        <div class="row">
          <button class="btn primary" data-merge>${ICON.refresh}${t('emailMerge')}</button>
          <button class="btn ghost" data-cancel>${t('back')}</button>
        </div>
      </div>`;
    wrap.querySelector('[data-cancel]').addEventListener('click', () => {
      close();
      onCancel?.();
    });
    wrap.querySelector('[data-merge]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        const out = await api.emailVerify(challengeId, '', true);
        close();
        onDone?.(out.profile);
      } catch (ex) {
        wrap.querySelector('.error').textContent = errorText(ex);
      }
    });
  };

  stepEmail();
  return close;
}
