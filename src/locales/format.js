// Locale-aware formatting for dates, times, numbers, money and durations (Intl only, no extra deps).
// Rule: switching language never changes the time zone — class schedules are shown in the business zone
// (Asia/Ho_Chi_Minh) unless a caller passes another zone explicitly.

export const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const INTL_LOCALE = { vi: 'vi-VN', ja: 'ja-JP', en: 'en-US' };

/** `{name}` placeholders → values; unknown placeholders are left visible so missing data is noticed. */
export function interpolate(template, vars) {
  if (!vars || typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (vars[key] === undefined || vars[key] === null ? match : String(vars[key])));
}

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)) return new Date(`${value}Z`); // API UTC without suffix
  return new Date(value);
}

export function createFormatters(locale = 'vi') {
  const tag = INTL_LOCALE[locale] || INTL_LOCALE.vi;
  const safe = (fn) => (value, ...rest) => {
    if (value === null || value === undefined || value === '') return '';
    try {
      return fn(value, ...rest);
    } catch {
      return '';
    }
  };
  const dt = (opts, timeZone = BUSINESS_TIME_ZONE) => new Intl.DateTimeFormat(tag, { timeZone, ...opts });

  return {
    locale,
    tag,
    /** 23/11/2026 · 2026/11/23 */
    date: safe((v, tz) => dt({ year: 'numeric', month: '2-digit', day: '2-digit' }, tz).format(toDate(v))),
    /** 18:00 */
    time: safe((v, tz) => dt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, tz).format(toDate(v))),
    /** 23/11/2026 18:00 · 2026/11/23 18:00 */
    dateTime: safe((v, tz) => dt({ year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, tz).format(toDate(v))),
    /** "Thứ Hai, ngày 23 tháng 11" · "11月23日（月）" */
    weekdayDate: safe((v, tz) => {
      const d = toDate(v);
      if (locale === 'ja') {
        const md = dt({ month: 'numeric', day: 'numeric' }, tz).format(d);
        const wd = dt({ weekday: 'short' }, tz).format(d);
        return `${md}（${wd}）`;
      }
      return dt({ weekday: 'long', day: 'numeric', month: 'long' }, tz).format(d);
    }),
    /** Weekday label for calendars: "T2" / "月" (short) or "Thứ Hai" / "月曜日" (long). */
    weekday: safe((v, style = 'short', tz) => {
      const d = toDate(v);
      if (locale === 'vi' && style === 'short') {
        const en = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz || BUSINESS_TIME_ZONE }).format(d);
        return { Sun: 'CN', Mon: 'T2', Tue: 'T3', Wed: 'T4', Thu: 'T5', Fri: 'T6', Sat: 'T7' }[en] || en;
      }
      return dt({ weekday: style }, tz).format(d);
    }),
    monthYear: safe((v, tz) => dt({ month: 'long', year: 'numeric' }, tz).format(toDate(v))),
    number: safe((v, opts) => new Intl.NumberFormat(tag, opts).format(Number(v))),
    percent: safe((v, digits = 0) => new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: digits }).format(Number(v) / 100)),
    /** Prices are VND in the product; the language only changes formatting. */
    currency: safe((v, currency = 'VND') => new Intl.NumberFormat(tag, { style: 'currency', currency, maximumFractionDigits: currency === 'VND' ? 0 : 2 }).format(Number(v))),
    /** 90 phút · 90分 ; 1 giờ 30 phút · 1時間30分 */
    duration: safe((minutes) => {
      const m = Math.max(0, Math.round(Number(minutes)));
      const h = Math.floor(m / 60);
      const r = m % 60;
      if (locale === 'ja') return h ? `${h}時間${r ? `${r}分` : ''}` : `${r}分`;
      return h ? `${h} giờ${r ? ` ${r} phút` : ''}` : `${r} phút`;
    }),
    /** "3 ngày nữa" / "3日後", "2 giờ trước" / "2時間前" */
    relative: safe((v, now = Date.now()) => {
      const diff = (toDate(v).getTime() - now) / 1000;
      const rtf = new Intl.RelativeTimeFormat(tag, { numeric: 'auto' });
      const abs = Math.abs(diff);
      if (abs < 60) return rtf.format(Math.round(diff), 'second');
      if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
      if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
      if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
      return rtf.format(Math.round(diff / (86400 * 30)), 'month');
    }),
  };
}
