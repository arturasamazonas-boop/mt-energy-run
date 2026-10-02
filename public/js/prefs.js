// localStorage wrapper that never throws (private mode, blocked storage…).
const KEY = 'mter:';

export const prefs = {
  get(k, def = null) {
    try {
      const v = localStorage.getItem(KEY + k);
      return v === null ? def : JSON.parse(v);
    } catch {
      return def;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(KEY + k, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  },
};
