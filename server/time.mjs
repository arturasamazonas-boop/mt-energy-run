// Calendar helpers in the company's home time zone.
const TZ = 'Europe/Vilnius';
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** 'YYYY-MM-DD' in Vilnius time. */
export function vilniusDay(date = new Date()) {
  return fmt.format(date);
}

/** ISO week key such as '2026-W43', based on the Vilnius calendar date. */
export function isoWeekKey(date = new Date()) {
  const [y, m, d] = vilniusDay(date).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const BIRTHDAY = process.env.BIRTHDAY || '10-24';

export function isBirthday(date = new Date()) {
  return vilniusDay(date).slice(5) === BIRTHDAY;
}
