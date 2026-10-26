export const PERIODS = [
  { id: 'Morning', name: 'Sáng', hour: 8 },
  { id: 'Afternoon', name: 'Chiều', hour: 13 },
  { id: 'Evening', name: 'Tối', hour: 18 },
];

export const REGISTRATION_PERIODS = PERIODS;
export function vietnamDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function shiftDate(key, days) {
  const date = new Date(`${key}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function monday(offset = 0) {
  const today = vietnamDate(); const day = new Date(`${today}T12:00:00Z`).getUTCDay();
  return shiftDate(today, -((day + 6) % 7) + offset * 7);
}
export function localTime(iso) {
  if (!iso) return '';
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : `${iso}Z`).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
