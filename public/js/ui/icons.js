// Inline SVG icons (stroke = currentColor).
const S = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;
const F = (p) => `<svg viewBox="0 0 24 24" fill="currentColor">${p}</svg>`;

export const ICON = {
  bolt: F('<path d="M13.5 2 4 13.5h6.5L9 22l10-12.5h-6.6L13.5 2z"/>'),
  play: F('<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/>'),
  trophy: S('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a4 4 0 0 1-4 4M7 5H4v2a4 4 0 0 0 4 4"/>'),
  wrench: S('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z"/>'),
  map: S('<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5L9 4z"/><path d="M9 4v13M15 6.5v13"/>'),
  user: S('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  gear: S('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  sound: S('<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'),
  mute: S('<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="m22 9-6 6M16 9l6 6"/>'),
  music: S('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  pause: F('<rect x="6" y="4.5" width="4.2" height="15" rx="1.2"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.2"/>'),
  close: S('<path d="M18 6 6 18M6 6l12 12"/>'),
  back: S('<path d="M15 18l-6-6 6-6"/>'),
  calendar: S('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
  star: F('<path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9L12 2.8z"/>'),
  medal: S('<circle cx="12" cy="14" r="6"/><path d="M8.5 9 6 3h4l2 4 2-4h4l-2.5 6"/>'),
  copy: S('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  refresh: S('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
  home: S('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>'),
  heart: F('<path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.2 3 4.5 6.6 4.5c2 0 3.3 1.1 4.1 2.3h2.6c.8-1.2 2.1-2.3 4.1-2.3 3.6 0 5.8 3.7 4.2 7.3C19.5 16.4 12 21 12 21z"/>'),
  // touch controls: a sliding and a jumping worker in a yellow helmet
  slideMan: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M4 50h56" stroke="rgba(255,255,255,.45)" stroke-width="2.5" stroke-linecap="round"/><path d="M3 37h9M1 43h8" stroke="rgba(255,255,255,.6)" stroke-width="2.5" stroke-linecap="round"/><circle cx="20" cy="27" r="6" fill="#fff"/><path d="M14 25.5a6.2 6.2 0 0 1 12 0z" fill="#FFD800" stroke="#fff" stroke-width="1.6"/><path d="M23 33 L32 42" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M32 42 L44 44 L56 45" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M32 42 L41 47 L53 47.5" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M24 35 L17 43" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M25 34 L33 31" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  jumpMan: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 56h52" stroke="rgba(255,255,255,.45)" stroke-width="2.5" stroke-linecap="round"/><path d="M8 54 Q18 30 32 26" stroke="rgba(255,255,255,.55)" stroke-width="2.5" stroke-dasharray="3 4" stroke-linecap="round" fill="none"/><g transform="translate(-2 8)"><circle cx="38" cy="12" r="6" fill="#fff"/><path d="M32 10.5a6.2 6.2 0 0 1 12 0z" fill="#FFD800" stroke="#fff" stroke-width="1.6"/><path d="M37 19 L35 32" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M35 32 L44 35 L41 44" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M35 32 L29 39 L34 46" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M37 22 L46 16" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M36 22 L28 18" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g></svg>',
  arrowUp: S('<path d="M12 19V5M5 12l7-7 7 7"/>', 'stroke-width="3"'),
  arrowDown: S('<path d="M12 5v14M19 12l-7 7-7-7"/>', 'stroke-width="3"'),
  logout: S('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  cake: S('<path d="M4 21h16v-8H4v8zM4 16c2 1.5 4 1.5 5.3 0 1.4 1.5 4 1.5 5.4 0 1.3 1.5 3.3 1.5 5.3 0"/><path d="M12 13V9M8 13v-3M16 13v-3M12 6.5c.8-.8.8-2 0-3-.8 1-.8 2.2 0 3z"/>'),
};
