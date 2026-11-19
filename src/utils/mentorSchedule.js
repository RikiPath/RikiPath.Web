import { translateTemplate, currentIntlTag } from '@/locales/locale.js';
export const PERIODS = [
  { id: 'Morning',   name: 'Sáng',  hour: 8,  timeRange: '08:00 – 12:00' },
  { id: 'Afternoon', name: 'Chiều', hour: 13, timeRange: '13:00 – 17:00' },
  { id: 'Evening',   name: 'Tối',   hour: 18, timeRange: '18:00 – 21:00' },
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
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : `${iso}Z`).toLocaleString(currentIntlTag(), { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Older PostgreSQL timestamps represent UTC but arrive without a timezone suffix.
export function backendUtcDate(value) {
  if (value instanceof Date) return value;
  const text = String(value || '');
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(text) || text.length === 10 ? text : text + 'Z');
}
export function vietnamInputValue(value) {
  return backendUtcDate(value).toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(' ', 'T').slice(0, 16);
}

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

function weekdayOfVietnamDate(key) {
  return new Date(`${key}T12:00:00+07:00`).getUTCDay();
}

function overlapsExisting(slots, day, from, to) {
  const rowStart = new Date(`${day}T${from}:00+07:00`).getTime();
  const rowEnd = new Date(`${day}T${to}:00+07:00`).getTime();
  return slots.some((slot) => {
    if (slot.rejectedAt) return false;
    const slotStart = backendUtcDate(slot.startTime).getTime();
    const slotEnd = backendUtcDate(slot.endTime).getTime();
    return slotStart < rowEnd && rowStart < slotEnd;
  });
}

/** Same date rules as CreateAvailabilityAsync: one block per matching weekday, max 8 hours, 1 year, 500 rows. */
export function planMentorAvailability({ date, from, to, until, repeating, days = [], slots = [], now = new Date() } = {}) {
  const empty = { ready: false, error: '', rows: [], overlapping: [] };
  if (!date || !from || !to || (repeating && !until)) return empty;
  if (repeating && days.length === 0) return { ...empty, error: 'Chọn ít nhất một thứ để lặp.' };
  const start = new Date(`${date}T${from}:00+07:00`);
  const end = new Date(`${date}T${to}:00+07:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { ...empty, error: 'Giờ không hợp lệ.' };
  if (!(end > start)) return { ...empty, error: 'Giờ kết thúc phải sau giờ bắt đầu, trong cùng một ngày.' };
  if (end - start > EIGHT_HOURS_MS) return { ...empty, error: 'Mỗi khung tối đa 8 giờ.' };
  if (start.getTime() <= now.getTime()) return { ...empty, error: 'Chọn giờ rảnh trong tương lai.' };
  const endKey = repeating ? until : date;
  if (endKey < date) return { ...empty, error: 'Ngày lặp phải từ ngày bắt đầu trở đi.' };
  if (endKey > shiftDate(date, 366)) return { ...empty, error: 'Hạn kết thúc tối đa một năm.' };
  const selected = new Set(days);
  const rows = [];
  for (let day = date; day <= endKey; day = shiftDate(day, 1)) {
    if (!repeating || selected.has(weekdayOfVietnamDate(day))) rows.push(day);
  }
  if (rows.length === 0) return { ...empty, error: 'Không có ngày phù hợp với các thứ đã chọn.' };
  if (rows.length > 500) return { ready: false, error: 'Quá nhiều buổi (tối đa 500). Rút ngắn khoảng lặp.', rows, overlapping: [] };
  const overlapping = rows.filter((day) => overlapsExisting(slots, day, from, to));
  if (overlapping.length > 0) {
    return {
      ready: false,
      error: translateTemplate('{0} buổi trùng lịch đã đăng ký. Gửi lên sẽ không lưu buổi nào.', { 0: overlapping.length }),
      rows,
      overlapping,
    };
  }
  return { ready: true, error: '', rows, overlapping: [] };
}
