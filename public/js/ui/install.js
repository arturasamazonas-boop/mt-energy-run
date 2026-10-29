// Keep the browser's one-use install prompt until the player asks for it.
import { t } from '../i18n.js';
import { ICON } from './icons.js';

const modes = ['standalone', 'minimal-ui', 'fullscreen'].map((mode) => window.matchMedia(`(display-mode: ${mode})`));
let deferredPrompt = null;
let installedThisSession = false;
let prompting = false;
let helpDialog = null;

function isInstalled() {
  return installedThisSession || navigator.standalone === true || modes[0].matches || modes[1].matches ||
    (modes[2].matches && !document.fullscreenElement);
}

function syncButtons() {
  const installed = isInstalled();
  document.querySelectorAll('[data-install]').forEach((button) => {
    button.hidden = installed;
    button.disabled = prompting;
  });
  const nativeButton = helpDialog?.querySelector('[data-native-install]');
  if (nativeButton) nativeButton.hidden = !deferredPrompt;
  if (installed) helpDialog?.close();
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  syncButtons();
});
window.addEventListener('appinstalled', () => {
  installedThisSession = true;
  deferredPrompt = null;
  syncButtons();
});
modes.forEach((mode) => mode.addEventListener?.('change', syncButtons));
document.addEventListener('fullscreenchange', syncButtons);

export function installButton() {
  return `<button type="button" class="chip install-chip" data-install ${isInstalled() ? 'hidden' : ''}>
    <img src="/assets/icon-mindaugas-192.png" width="28" height="28" alt="">
    <span>${t('install')}</span>${ICON.download}
  </button>`;
}

export function bindInstallButton(root) {
  root.querySelectorAll('[data-install]').forEach((button) => button.addEventListener('click', install));
  syncButtons();
}

async function install() {
  if (isInstalled() || prompting) return;
  if (!deferredPrompt) return showHelp();
  const prompt = deferredPrompt;
  deferredPrompt = null; // each browser event can only be used once
  prompting = true;
  helpDialog?.close();
  syncButtons();
  try {
    await prompt.prompt(); // called directly from the player's click
    await prompt.userChoice;
  } catch {
    showHelp();
  } finally {
    prompting = false;
    syncButtons();
  }
}

function showHelp() {
  if (helpDialog?.open) return;
  const appleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const macSafari = !appleMobile && /Mac/.test(navigator.platform) &&
    /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent);
  const steps = appleMobile ? ['installIOS1', 'installIOS2', 'installIOS3'] :
    macSafari ? ['installMac1', 'installMac2'] : ['installMenu1', 'installMenu2'];
  const previousFocus = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'panel dialog install-dialog';
  dialog.setAttribute('aria-labelledby', 'install-title');
  dialog.innerHTML = `
    <div class="install-heading">
      <img src="/assets/icon-mindaugas-192.png" width="72" height="72" alt="">
      <div><small>MT GROUP</small><h2 id="install-title">Energy Run</h2></div>
      <button type="button" class="icon-btn" data-install-close aria-label="${t('back')}">${ICON.close}</button>
    </div>
    <p class="muted">${t('installIntro')}</p>
    <ol class="install-steps">${steps.map((key) => `<li>${t(key)}</li>`).join('')}</ol>
    <button type="button" class="btn primary" data-native-install ${deferredPrompt ? '' : 'hidden'}>${ICON.download}${t('install')}</button>
    <button type="button" class="btn ghost" data-install-close>${t('back')}</button>`;
  dialog.querySelectorAll('[data-install-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.querySelector('[data-native-install]').addEventListener('click', install);
  dialog.addEventListener('close', () => {
    if (helpDialog === dialog) helpDialog = null;
    dialog.remove();
    if (previousFocus?.isConnected && !previousFocus.hidden) previousFocus.focus();
  }, { once: true });
  document.body.appendChild(dialog);
  helpDialog = dialog;
  dialog.showModal();
}
