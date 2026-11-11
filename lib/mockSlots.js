const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const TZ = 'Asia/Hong_Kong';

export function buildCalendar(days = 14) {
  const nowMs = Date.now();
  const hk = new Date(nowMs + 8 * 3600 * 1000);
  const base = Date.UTC(hk.getUTCFullYear(), hk.getUTCMonth(), hk.getUTCDate());
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(base + i * 86400000);
    const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
    const slots = HOURS.map((h) => Date.UTC(y, m, day, h) - 8 * 3600 * 1000).filter((ms) => ms > nowMs + 2 * 3600 * 1000);
    out.push({
      key: `${y}-${m + 1}-${day}`,
      day,
      dow: (d.getUTCDay() + 6) % 7, // Monday = 0
      month: d.toLocaleDateString('en-HK', { month: 'short', timeZone: 'UTC' }),
      long: d.toLocaleDateString('en-HK', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
      slots,
    });
  }
  return out;
}

export const fmtTime = (ms) =>
  new Date(ms).toLocaleTimeString('en-HK', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });

export const fmtFull = (iso) =>
  new Date(iso).toLocaleString('en-HK', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }) + ' HKT';